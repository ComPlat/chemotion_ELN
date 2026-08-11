# frozen_string_literal: true

# rubocop: disable Metrics/ClassLength, Metrics/AbcSize, Performance/MethodObjectAsBlock
module Export
  class ExportCollections
    attr_accessor :file_path

    # rubocop:disable Style/OptionalBooleanParameter, Metrics/ParameterLists
    def initialize(export_id, collection_ids, format = 'zip', nested = false, gate = false, current_user_id = nil)
      @export_id = export_id
      @collection_ids = collection_ids
      @format = format
      @nested = nested
      @gt = gate
      @current_user_id = current_user_id

      @file_path = Rails.public_path.join(format, "#{export_id}.#{format}")
      @schema_file_path = Rails.public_path.join('json', 'schema.json')

      @data = {}
      @uuids = {}
      @attachments = []
      @datasets = []
      @images = []
      # Attachments created for the export itself (e.g. a converted reaction-link image, see
      # #build_research_plan_image_attachment), as opposed to pre-existing ones already on the
      # exporting system. Tracked so they can be purged once no longer needed — export must not
      # leave new rows/files (and quota usage) behind on the system being exported from.
      @synthetic_attachments = []
    end
    # rubocop:enable Style/OptionalBooleanParameter, Metrics/ParameterLists

    def to_json_data
      @data.to_json
    end

    def to_udm
      builder = Export::ExportCollectionsUdmBuilder.new @data
      builder.to_xml
    end

    # rubocop:disable Metrics/MethodLength,Metrics/CyclomaticComplexity
    def to_file
      case @format
      when 'json'
        # write the json file public/json/
        File.write(@file_path, to_json_data)

      when 'udm'
        # write the json file public/udm/
        File.write(@file_path, to_udm)

      when 'zip'
        # prepare the desription file
        description = <<~DESC
          file_name: #{@export_id}.zip

          files:
        DESC

        # create a zip buffer
        Zip.write_zip64_support = true
        Zip::OutputStream.open(@file_path) do |zipping| # rubocop:disable Metrics/BlockLength
          # write the json file into the zip file
          export_json = to_json_data
          export_json_checksum = Digest::SHA256.hexdigest(export_json)
          zipping.put_next_entry 'export.json'
          zipping.write export_json
          description += "#{export_json_checksum} export.json\n"

          # write the json schema
          schema_json = File.read(@schema_file_path)
          schema_json_checksum = Digest::SHA256.hexdigest(schema_json)
          zipping.put_next_entry 'schema.json'
          zipping.write schema_json
          description += "#{schema_json_checksum} schema.json\n"
          # write all attachemnts into an attachments directory
          dir_path = Pathname.new('attachments')
          @attachments.each do |attachment|
            uploaded_file = attachment.attachment
            next unless uploaded_file.exists?

            attachment_path = dir_path.join("#{attachment.identifier}#{File.extname(attachment.filename)}")
            zipping.put_next_entry attachment_path.to_s
            uploaded_file.stream(zipping)
            description += "#{attachment.checksum} #{attachment_path}\n"
            next unless attachment.annotated_image?

            annotation = attachment.attachment(:annotation)
            zipping.put_next_entry "#{attachment_path}_annotation"
            annotation.stream(zipping)
          ensure
            uploaded_file.to_io.close if uploaded_file.respond_to?(:to_io)
            annotation.to_io.close if annotation.respond_to?(:to_io)
          end
          # write all the images into an images directory
          @images.each do |file_path|
            image_data = Rails.public_path.join(file_path).read
            image_checksum = Digest::SHA256.hexdigest(image_data)
            zipping.put_next_entry file_path
            zipping.write image_data
            description += "#{image_checksum} #{file_path}\n"
          end

          # write the description file
          zipping.put_next_entry 'description.txt'
          zipping.write description
        end

        @file_path
      end
    ensure
      # Synthetic attachments only need to survive long enough to be streamed above; the exporting
      # system must not be left holding new rows/files (and quota usage) after export finishes.
      cleanup_synthetic_attachments
    end

    def prepare_data
      # get the collections from the database, in order of ancestry, but with empty ancestry first
      collections = Collection.order(ancestry: :asc).find(@collection_ids)
      # add decendants for nested collections
      if @nested
        descendants = []
        Collection.find(@collection_ids).each do |collection|
          descendants += collection.descendants
        end
        collections += descendants
      end

      Labimotion::Export.fetch_element_klasses(&method(:fetch_many)) # rubocop:disable Performance/MethodObjectAsBlock
      Labimotion::Export.fetch_segment_klasses(&method(:fetch_many)) # rubocop:disable Performance/MethodObjectAsBlock
      Labimotion::Export.fetch_dataset_klasses(&method(:fetch_many)) # rubocop:disable Performance/MethodObjectAsBlock
      # loop over all collections
      collections.each do |collection|
        # fetch collection
        fetch_one(collection, { 'user_id' => 'User' })
        fetch_samples collection
        fetch_chemicals collection
        fetch_components collection
        fetch_reactions collection
        fetch_elements collection

        if @gt == false
          fetch_wellplates collection
          fetch_screens collection
          fetch_research_plans collection
          add_cell_line_material_to_package collection
          add_cell_line_sample_to_package collection
          fetch_sequence_based_macromolecule_samples collection
          fetch_device_descriptions collection
        end

        fetch_segments
      end

      remap_research_plan_body_links
    rescue StandardError
      # A synthetic attachment from an earlier, already-processed research plan must not outlive a
      # failed export — #to_file (the normal cleanup point, see its ensure) will never run.
      cleanup_synthetic_attachments
      raise
    end

    private

    def fetch_sequence_based_macromolecule_samples(collection)
      # get sbmm samples in order of ancestry, but with empty ancestry first
      sbmm_samples = collection.sequence_based_macromolecule_samples
                               .order(ancestry: :asc)
      # fetch sbmm samples
      fetch_many(sbmm_samples, {
                   'sequence_based_macromolecule_id' => 'SequenceBasedMacromolecule',
                   'user_id' => 'User',
                 })
      fetch_many(collection.collections_sequence_based_macromolecule_samples, {
                   'collection_id' => 'Collection',
                   'sequence_based_macromolecule_sample_id' => 'SequenceBasedMacromoleculeSample',
                 })

      # loop over sbmm samples and fetch sbmm sample properties
      sbmm_samples.each do |sbmm_sample|
        fetch_sequence_based_macromolecule(sbmm_sample)

        # fetch containers, attachments and literature
        fetch_containers(sbmm_sample)

        fetch_many(sbmm_sample.attachments, {
                     'attachable_id' => 'SequenceBasedMacromoleculeSample',
                     'created_by' => 'User',
                     'created_for' => 'User',
                   })

        # add attachments to the list of attachments
        @attachments += sbmm_sample.attachments
      end
    end

    def fetch_sequence_based_macromolecule(sbmm_sample)
      sbmm = sbmm_sample.sequence_based_macromolecule
      fetch_sequence_based_macromolecule_or_parent_and_attachments(sbmm)

      fetch_sequence_based_macromolecule_or_parent_and_attachments(sbmm.parent) if sbmm.parent

      return unless sbmm_sample.sequence_based_macromolecule.post_translational_modification

      fetch_one(sbmm.protein_sequence_modification)

      return unless sbmm_sample.sequence_based_macromolecule.post_translational_modification

      fetch_one(sbmm.post_translational_modification)
    end

    def fetch_sequence_based_macromolecule_or_parent_and_attachments(sbmm)
      fetch_one(sbmm, {
                  'parent_id' => 'SequenceBasedMacromolecule',
                  'protein_sequence_modification_id' => 'ProteinSequenceModification',
                  'post_translational_modification_id' => 'PostTranslationalModification',
                })
      fetch_many(sbmm.attachments, {
                   'attachable_id' => 'SequenceBasedMacromolecule',
                   'created_by' => 'User',
                   'created_for' => 'User',
                 })
      # add sbmm attachments to the list of attachments
      @attachments += sbmm.attachments
    end

    def fetch_device_descriptions(collection)
      # get device descriptions in order of ancestry, but with empty ancestry first
      device_descriptions = collection.device_descriptions.order(ancestry: :asc)

      # fetch device descriptions
      fetch_many(device_descriptions, { 'created_by' => 'User' })
      fetch_many(collection.collections_device_descriptions, {
                   'collection_id' => 'Collection',
                   'device_description_id' => 'DeviceDescription',
                 })

      # loop over device descriptions to get container and attachments
      device_descriptions.each do |device_description|
        transform_device_description_special_fields(device_description)
        fetch_device_description_containers_and_attachments(device_description)
        fetch_device_description_segments(device_description)
      end

      # fetch related device descriptions from setup_descriptions
      fetch_related_device_descriptions(device_descriptions, collection)
    end

    def fetch_device_description_containers_and_attachments(device_description)
      fetch_containers(device_description)
      fetch_many(device_description.attachments, {
                   'attachable_id' => 'DeviceDescription',
                   'created_by' => 'User',
                   'created_for' => 'User',
                 })

      # add attachments to the list of attachments
      @attachments += device_description.attachments
    end

    def fetch_device_description_segments(device_description)
      segments =
        Labimotion::Segment.where(element_id: device_description.id, element_type: 'DeviceDescription')
      return if segments.blank?

      fetch_many(segments, {
                   'element_id' => 'DeviceDescription',
                   'segment_klass_id' => 'Labimotion::SegmentKlass',
                   'created_by' => 'User',
                 })
    end

    def transform_device_description_special_fields(device_description)
      dd_uuid = uuid('DeviceDescription', device_description.id)
      return unless @data['DeviceDescription']&.key?(dd_uuid)

      transform_device_description_setup_descriptions(dd_uuid)
      transform_device_description_ontologies(dd_uuid)
    end

    def transform_device_description_setup_descriptions(dd_uuid)
      setup_descriptions = @data['DeviceDescription'][dd_uuid]['setup_descriptions']
      return if setup_descriptions.blank?

      setup_descriptions.each_key do |setup_type|
        next if setup_descriptions[setup_type].blank?

        setup_descriptions[setup_type].each do |entry|
          next if entry['device_description_id'].blank?

          entry['device_description_id'] = uuid('DeviceDescription', entry['device_description_id'])
        end
      end
    end

    def transform_device_description_ontologies(dd_uuid)
      ontologies = @data['DeviceDescription'][dd_uuid]['ontologies']
      return if ontologies.blank?

      ontologies.each do |ontology|
        if ontology['data']['segment_ids'].present?
          data_segment_ids = []
          ontology['data']['segment_ids'].map do |id|
            data_segment_ids << uuid('Labimotion::SegmentKlass', id)
          end
          ontology['data']['segment_ids'] = data_segment_ids if data_segment_ids.present?
        end

        next if ontology['segments'].present?

        ontology['segments'].each do |entry|
          entry['segment_klass_id'] = uuid('Labimotion::SegmentKlass', entry['segment_klass_id'])
        end
      end
    end

    # rubocop:disable Metrics/PerceivedComplexity
    def fetch_related_device_descriptions(device_descriptions, collection, checked_ids = [])
      setup_types = %w[setup component]
      # IDs of device descriptions already being exported (in any collection)
      exported_ids = @data['DeviceDescription']&.keys || []

      device_descriptions.each do |device_description|
        next if checked_ids.include?(device_description.id)

        checked_ids << device_description.id
        setup_type = device_description.device_class
        next if setup_types.exclude?(setup_type) || device_description.setup_descriptions[setup_type].blank?

        # get device_description_ids from setup_descriptions
        related_ids = device_description.setup_descriptions[setup_type].pluck('device_description_id')
        next if related_ids.blank?

        # only fetch device descriptions that are not already exported
        ids_to_fetch = related_ids - exported_ids - checked_ids
        next if ids_to_fetch.empty?

        export_related_device_descriptions(ids_to_fetch, collection, checked_ids)
      end
    end
    # rubocop:enable Metrics/PerceivedComplexity

    def export_related_device_descriptions(ids_to_fetch, collection, checked_ids)
      related_device_descriptions = DeviceDescription.where(id: ids_to_fetch)
      return if related_device_descriptions.empty?

      # fetch the related device descriptions
      fetch_many(related_device_descriptions, { 'created_by' => 'User' })

      # create collections_device_descriptions entries for the same collection
      related_device_descriptions.each do |related_device_description|
        transform_device_description_special_fields(related_device_description)
        fetch_collections_device_description(collection, related_device_description)
        fetch_device_description_containers_and_attachments(related_device_description)
        fetch_device_description_segments(related_device_description)
      end

      # recursively fetch related device descriptions
      fetch_related_device_descriptions(related_device_descriptions, collection, checked_ids)
    end

    def fetch_collections_device_description(collection, device_description)
      collection_device_description = CollectionsDeviceDescription.find_or_initialize_by(
        collection_id: collection.id,
        device_description_id: device_description.id,
      )
      if collection_device_description.new_record?
        collection_device_description.id =
          uuid('CollectionsDeviceDescription', "#{collection.id}-#{device_description.id}")
      end
      fetch_one(collection_device_description, {
                  'collection_id' => 'Collection',
                  'device_description_id' => 'DeviceDescription',
                })
    end

    def add_cell_line_material_to_package(collection)
      type = 'CelllineMaterial'
      collection.cellline_samples.each do |sample|
        material = sample.cellline_material
        next if uuid?(type, material.id)

        uuid = uuid(type, material.id)
        @data[type] = {} unless @data[type]
        @data[type][uuid] = material.as_json
      end
    end

    def add_cell_line_sample_to_package(collection)
      type = 'CelllineSample'
      collection.cellline_samples.each do |sample|
        next if uuid?(type, sample.id)

        uuid = uuid(type, sample.id)
        @data[type] = {} unless @data[type]
        @data[type][uuid] = sample.as_json
        fetch_containers(sample)
        @data['CollectionsCelllineSample'] = {} unless @data['CollectionsCelllineSample']
        @data['CollectionsCelllineSample'][SecureRandom.uuid] = {
          collection_id: @uuids['Collection'][collection.id],
          cellline_sample_id: @uuids[type][sample.id],
        }

        @data['CelllineMaterialCelllineSample'] = {} unless @data['CelllineMaterialCelllineSample']
        @data['CelllineMaterialCelllineSample'][SecureRandom.uuid] = {
          cellline_material_id: @uuids['CelllineMaterial'][sample.cellline_material.id],
          cellline_sample_id: @uuids[type][sample.id],
        }
      end
    end

    def fetch_chemicals(collection)
      chemicals = collection.samples.filter_map(&:chemical)
      fetch_many(chemicals, {
                   'id' => 'Chemical',
                   'sample_id' => 'Sample',
                 })
    end

    def fetch_components(collection)
      components = collection.samples.flat_map(&:components)
      fetch_many(components, {
                   'id' => 'Component',
                   'sample_id' => 'Sample',
                 })
    end

    def fetch_samples(collection)
      # get samples in order of ancestry, but with empty ancestry first
      samples = collection.samples.order(ancestry: :asc)
      # fetch samples
      fetch_many(samples, {
                   'molecule_name_id' => 'MoleculeName',
                   'molecule_id' => 'Molecule',
                   'fingerprint_id' => 'Fingerprint',
                   'created_by' => 'User',
                   'user_id' => 'User',
                 })
      fetch_many(collection.collections_samples, {
                   'collection_id' => 'Collection',
                   'sample_id' => 'Sample',
                 })

      # loop over samples and fetch sample properties
      samples.each do |sample|
        fetch_one(sample.fingerprint)
        fetch_one(sample.molecule)
        fetch_one(sample.molecule_name, {
                    'molecule_id' => 'Molecule',
                    'user_id' => 'User',
                  })
        fetch_many(sample.residues, {
                     'sample_id' => 'Sample',
                   })

        upload_att = Labimotion::Export.fetch_segments(sample, @uuids, nil, &method(:fetch_one))
        @attachments += upload_att if upload_att&.length&.positive?

        # fetch containers, attachments and literature
        fetch_containers(sample)
        fetch_literals(sample)

        # collect the sample_svg_file and molecule_svg_file
        fetch_image('samples', sample.sample_svg_file)
        fetch_image('molecules', sample.molecule.molecule_svg_file)
      end
    end

    def fetch_reactions(collection)
      fetch_many(collection.reactions, {
                   'created_by' => 'User',
                 })
      fetch_many(collection.collections_reactions, {
                   'collection_id' => 'Collection',
                   'reaction_id' => 'Reaction',
                 })

      # loop over reactions and fetch reaction properties
      collection.reactions.each do |reaction|
        # fetch relations between reactions and samples
        # this is one table but several models (Single Table Inheritance)
        [
          reaction.reactions_starting_material_samples,
          reaction.reactions_solvent_samples,
          reaction.reactions_purification_solvent_samples,
          reaction.reactions_reactant_samples,
          reaction.reactions_product_samples,
        ].each do |instances|
          fetch_many(instances, {
                       'reaction_id' => 'Reaction',
                       'sample_id' => 'Sample',
                     })
        end

        upload_att = Labimotion::Export.fetch_segments(reaction, @uuids, nil, &method(:fetch_one))
        @attachments += upload_att if upload_att&.length&.positive?

        # fetch containers, attachments and literature
        fetch_containers(reaction)
        fetch_literals(reaction)

        # collect the reaction_svg_file
        fetch_image('reactions', reaction.reaction_svg_file)
      end
    end

    def fetch_elements(collection)
      upload_att = Labimotion::Export.fetch_elements(
        collection,
        @uuids,
        method(:fetch_many),
        method(:fetch_one),
        method(:fetch_containers),
      )
      @attachments += upload_att if upload_att&.length&.positive?
    end

    def fetch_segments
      @data = Labimotion::Export.fetch_segments_prop(@data, @uuids)
    end

    def fetch_wellplates(collection)
      fetch_many(collection.wellplates)
      fetch_many(collection.collections_wellplates, {
                   'collection_id' => 'Collection',
                   'wellplate_id' => 'Wellplate',
                 })

      # fetch containers and attachments
      collection.wellplates.each do |wellplate|
        fetch_many(wellplate.wells, {
                     'sample_id' => 'Sample',
                     'wellplate_id' => 'Wellplate',
                   })

        upload_att = Labimotion::Export.fetch_segments(wellplate, @uuids, nil, &method(:fetch_one))
        @attachments += upload_att if upload_att&.length&.positive?

        fetch_containers(wellplate)
      end
    end

    def fetch_screens(collection)
      fetch_many(collection.screens)
      fetch_many(collection.collections_screens, {
                   'collection_id' => 'Collection',
                   'screen_id' => 'Screen',
                 })

      # loop over screens and fetch screen properties
      collection.screens.each do |screen|
        # fetch relation between wellplates_screens and screen
        fetch_many(screen.screens_wellplates, {
                     'screen_id' => 'Screen',
                     'wellplate_id' => 'Wellplate',
                   })

        fetch_many(screen.research_plans_screens, {
                     'screen_id' => 'Screen',
                     'research_plan_id' => 'ResearchPlan',
                   })

        upload_att = Labimotion::Export.fetch_segments(screen, @uuids, nil, &method(:fetch_one))
        @attachments += upload_att if upload_att&.length&.positive?

        # fetch containers and attachments
        fetch_containers(screen)
      end
    end

    def fetch_research_plans(collection)
      fetch_many(collection.research_plans, {
                   'created_by' => 'User',
                 })
      fetch_many(collection.collections_research_plans, {
                   'collection_id' => 'Collection',
                   'research_plan_id' => 'ResearchPlan',
                 })

      # loop over research plans and fetch research plan properties
      collection.research_plans.each do |research_plan|
        # fetch attachments
        # attachments are directly related to research plans so we don't need fetch_containers
        fetch_many(research_plan.attachments, {
                     'attachable_id' => 'ResearchPlan',
                     'created_by' => 'User',
                     'created_for' => 'User',
                   })

        # Fetch attachments referenced in the body by public_name
        fetch_research_plan_body_attachments(research_plan)

        upload_att = Labimotion::Export.fetch_segments(research_plan, @uuids, nil, &method(:fetch_one))
        @attachments += upload_att if upload_att&.length&.positive?

        # add attachments to the list of attachments
        @attachments += research_plan.attachments

        # fetch literature
        fetch_literals(research_plan)

        # collect the svg_files
        research_plan.svg_files.each do |svg_file|
          fetch_image('research_plans', svg_file)
        end
      end
    end

    def fetch_research_plan_body_attachments(research_plan)
      return if research_plan.body.blank?

      image_fields = extract_image_fields(research_plan.body)
      return if image_fields.empty?

      attachments = Attachment.where(identifier: image_fields.keys,
                                     attachable_id: nil,
                                     attachable_type: 'ResearchPlan')

      filter_missing_attachments(research_plan, attachments)
      process_attachments(attachments, research_plan)
    end

    # research plan bodies can embed links to other elements (e.g. type 'sample'/'reaction' fields
    # holding a 'sample_id'/'reaction_id'). These still reference the source system's database id, so
    # translate them to the same uuid used for the referenced element itself, once all collections have
    # been fetched, so that import can resolve them against the newly created records (see
    # Import::ImportCollections#import_research_plans). A sample link whose target isn't part of this
    # export is instead converted into a static 'ketcher' field with the sample's structure (see
    # #convert_sample_link_to_ketcher?), and a reaction link in the same situation into a static 'image'
    # field with its report-style scheme (see #convert_reaction_link_to_image?), so the chemistry
    # survives even though the live record doesn't. A link that can't be converted is dropped rather than
    # left with a stale id — on import that id could coincidentally match an unrelated record on the
    # target system.
    def remap_research_plan_body_links
      @data.fetch('ResearchPlan', {}).each do |research_plan_uuid, fields|
        body = fields['body']
        next if body.blank?

        fields['body'] = body.reject { |field| unresolved_body_link?(field, research_plan_uuid) }
      end
    end

    def unresolved_body_link?(field, research_plan_uuid)
      case field['type']
      when 'sample'
        unresolved_sample_link?(field)
      when 'reaction'
        unresolved_reaction_link?(field, research_plan_uuid)
      else
        false
      end
    end

    def unresolved_sample_link?(field)
      old_id = field.dig('value', 'sample_id')
      return true if old_id.blank?
      return drop_unless_remapped?(field, 'sample_id', 'Sample') if uuid?('Sample', old_id)

      convert_sample_link_to_ketcher?(field, old_id)
    end

    def unresolved_reaction_link?(field, research_plan_uuid)
      old_id = field.dig('value', 'reaction_id')
      return true if old_id.blank?
      return drop_unless_remapped?(field, 'reaction_id', 'Reaction') if uuid?('Reaction', old_id)

      convert_reaction_link_to_image?(field, old_id, research_plan_uuid)
    end

    def drop_unless_remapped?(field, key, type)
      old_id = field.dig('value', key)
      return true if old_id.blank?
      return true unless uuid?(type, old_id)

      field['value'][key] = uuid(type, old_id)
      false
    end

    # Preserve the structure of a sample linked from outside the export as a static Ketcher schema,
    # provided the exporting user can actually see that sample's structure — otherwise a research plan
    # could be used to smuggle a structure out of a collection the exporting user has no (or only
    # detail-level-restricted) access to; a sample shared at the lowest detail level is readable but its
    # molfile is anonymized (see SampleEntity's `anonymize_below: 1`), so #read? alone isn't enough.
    # Returns `false` when the field was converted (i.e. keep it), `true` when it should be dropped.
    def convert_sample_link_to_ketcher?(field, sample_id)
      return true if exporting_user.nil?

      sample = Sample.find_by(id: sample_id)
      return true if sample&.molfile.blank?

      policy = ElementPolicy.new(exporting_user, sample)
      return true unless policy.read? && policy.read_structure?

      field['type'] = 'ketcher'
      field['value'] = { 'sdf_file' => sample.molfile, 'svg_file' => build_research_plan_ketcher_svg(sample.molfile) }
      false
    end

    # Renders a preview svg for a synthesized ketcher field, following the same convention research
    # plan ketcher fields already use (see POST /api/v1/research_plans/svg in research_plan_api.rb):
    # a content-addressed filename under public/images/research_plans/. Written on the exporting
    # system (a real Ketcher-drawn field's svg is written there too, when the user saves it) and
    # bundled into the zip so it can be materialized on import (see
    # Import::ImportCollections#materialize_researchplan_ketcher_images). Returns nil — leaving the
    # field with no preview, same as before — if rendering fails; the sdf_file is preserved either way.
    def build_research_plan_ketcher_svg(molfile)
      svg = Molecule.svg_reprocess(nil, molfile)
      return nil if svg.blank?

      filename = "#{Digest::SHA256.hexdigest(Digest::SHA256.hexdigest(svg))}.svg"
      target_path = Rails.public_path.join('images', 'research_plans', filename)
      unless File.file?(target_path)
        FileUtils.mkdir_p(target_path.dirname)
        File.write(target_path, svg)
      end

      fetch_image('research_plans', filename)
      filename
    rescue StandardError => e
      Rails.logger.error("Failed to render ketcher preview svg: #{e.message}")
      nil
    end

    # Preserve a reaction linked from outside the export as a static image of its report-style scheme
    # (the same rendering used when generating docx reports, see Reaction#compose_report_scheme_svg),
    # provided the exporting user holds full detail access — a plain #read? isn't enough, since
    # ReactionEntity only exposes `reaction_svg_file` at `anonymize_below: 10`, i.e. full detail.
    # Returns `false` when the field was converted (i.e. keep it), `true` when it should be dropped.
    def convert_reaction_link_to_image?(field, reaction_id, research_plan_uuid)
      return true if exporting_user.nil?

      reaction = Reaction.find_by(id: reaction_id)
      return true if reaction.blank?

      policy = ElementPolicy.new(exporting_user, reaction)
      return true unless policy.read? && policy.read_full_detail?

      svg = reaction.compose_report_scheme_svg
      return true if svg.blank?

      attachment = build_research_plan_image_attachment(svg)
      return true if attachment.nil?

      bundle_research_plan_image_attachment(attachment, research_plan_uuid)

      field['type'] = 'image'
      field['value'] = { 'public_name' => attachment.identifier, 'file_name' => attachment.filename }
      false
    end

    # A research plan 'image' field always points at a real, if initially unassociated, Attachment
    # record (see #fetch_research_plan_body_attachments) — so a synthesized one needs one too.
    def build_research_plan_image_attachment(svg)
      tmp = Tempfile.new(['reaction_scheme', '.svg'])
      tmp.write(svg)
      tmp.rewind

      attachment = Attachment.new(
        attachable_type: 'ResearchPlan',
        filename: "#{SecureRandom.uuid}.svg",
        file_path: tmp.path,
        created_by: exporting_user.id,
        created_for: exporting_user.id,
      )
      attachment.save!
      # Tracked immediately on persistence, not after a successful #bundle_..., so it still gets
      # cleaned up even if something downstream fails before the field is actually converted.
      @synthetic_attachments << attachment
      # Without this, the in-memory Shrine reference set by the after_save attach callback streams
      # back empty on its first read — a fresh reload forces it to rebuild from the persisted record.
      # Note: Attachment#reload returns set_key's value, not self, so it can't be the last expression.
      attachment.reload
      attachment
    rescue StandardError => e
      Rails.logger.error("Failed to attach research plan report image: #{e.message}")
      nil
    ensure
      tmp&.close
      tmp&.unlink
    end

    # Bundles the attachment for the zip exactly like a pre-existing research-plan image attachment
    # would be (see #process_attachments), associating it in the exported JSON — but not on the
    # exporting system itself — with the research plan whose body now references it.
    def bundle_research_plan_image_attachment(attachment, research_plan_uuid)
      attachment['attachable_id'] = real_id_for_uuid('ResearchPlan', research_plan_uuid)
      fetch_many([attachment], 'attachable_id' => 'ResearchPlan', 'created_by' => 'User', 'created_for' => 'User')
      @attachments << attachment
    end

    def real_id_for_uuid(type, target_uuid)
      @uuids.fetch(type, {}).key(target_uuid)
    end

    # Hard-deletes every attachment #build_research_plan_image_attachment created for this export —
    # Attachment uses acts_as_paranoid, and a merely soft-deleted row would still count against the
    # exporting user's quota. Idempotent (clears the tracked list), so calling it more than once, or
    # after a partial failure, is safe.
    def cleanup_synthetic_attachments
      @synthetic_attachments.each do |attachment|
        attachment.really_destroy!
      rescue StandardError => e
        Rails.logger.error("Failed to clean up synthetic research plan attachment #{attachment.id}: #{e.message}")
      end
      @synthetic_attachments.clear
    end

    def exporting_user
      return @exporting_user if defined?(@exporting_user)

      @exporting_user = @current_user_id && User.find_by(id: @current_user_id)
    end

    def extract_image_fields(body)
      body.select { |field| field['type'] == 'image' }
          .each_with_object({}) do |field, map|
            public_name = field['value']['public_name']
            map[public_name] = field if public_name.present?
          end
    end

    def filter_missing_attachments(research_plan, attachments)
      found_public_names = attachments.map(&:identifier)
      research_plan.body = research_plan.body.reject do |field|
        field['type'] == 'image' && found_public_names.exclude?(field['value']['public_name'])
      end
    end

    def process_attachments(attachments, research_plan)
      attachments.each { |attachment| attachment['attachable_id'] = research_plan.id }
      fetch_many(attachments, {
                   'attachable_id' => 'ResearchPlan',
                   'created_by' => 'User',
                   'created_for' => 'User',
                 })
      @attachments += attachments
    end

    def fetch_containers(containable)
      containable_type = containable.class.name
      # fetch root container
      root_container = containable.container
      fetch_one(containable.container, {
                  'containable_id' => containable_type,
                  'parent_id' => 'Container',
                })

      unless root_container.nil? # rubocop:disable Style/GuardClause
        # fetch analyses container
        analyses_container = root_container.children.where("container_type = 'analyses'").first
        fetch_one(analyses_container, {
                    'containable_id' => containable_type,
                    'parent_id' => 'Container',
                  })

        # fetch analysis_containers
        analysis_containers = analyses_container.children.where("container_type = 'analysis'")

        analysis_containers.each do |analysis_container|
          fetch_one(analysis_container, {
                      'containable_id' => containable_type,
                      'parent_id' => 'Container',
                    })

          # fetch attachment containers and attachments
          attachment_containers = analysis_container.children.where("container_type = 'dataset'")
          attachment_containers.each do |attachment_container|
            fetch_one(attachment_container, {
                        'containable_id' => containable_type,
                        'parent_id' => 'Container',
                      })
            if attachment_container.dataset.present?
              @datasets += Labimotion::Export.fetch_datasets(attachment_container.dataset,
                                                             &method(:fetch_one))
            end
            fetch_many(attachment_container.attachments, {
                         'attachable_id' => 'Container',
                         'created_by' => 'User',
                         'created_for' => 'User',
                       })

            # add attachments to the list of attachments
            @attachments += attachment_container.attachments
          end
        end
      end
    end

    def fetch_literals(element)
      element_type = element.class.name

      # a manual query needed since there is no Active Record Associations available
      literals = Literal.where(element_id: element.id, element_type: element_type)
      literals.each do |literal|
        fetch_one(literal.literature)
        fetch_one(literal, {
                    'literature_id' => 'Literature',
                    'element_id' => element_type,
                    'user_id' => 'User',
                  })
      end
    end

    def fetch_many(instances, foreign_keys = {})
      instances.each do |instance|
        fetch_one(instance, foreign_keys)
      end
    end

    # rubocop:disable Metrics/PerceivedComplexity
    def fetch_one(instance, foreign_keys = {})
      return if instance.nil?

      # get the type from the class
      # IMPORTANT: this is a strings, not a symbol
      type = instance.class.name

      # get the uuid and only continue it does not exist yet
      uuid = uuid(type, instance.id)
      unless uuid?(type, uuid)
        # replace id and foreign_keys with uuids
        update = {}
        foreign_keys.each do |foreign_key, foreign_table|
          update[foreign_key] = uuid(foreign_table, instance.send(foreign_key))
        end

        # append updated json to @data
        @data[type] = {} unless @data.key?(type)
        # replace ids in the ancestry field
        if instance.respond_to?(:ancestry)
          ancestor_uuids = []
          instance.ancestor_ids.map do |ancestor_id|
            ancestor_uuids << uuid(type, ancestor_id)
          end
          update['ancestry'] = ancestor_uuids.join('/')
        end

        # check if deleted_at is nil
        if instance.respond_to?(:deleted_at) && !instance.deleted_at.nil?
          raise 'Instance with non nil deleted_at in export'
        end

        @data[type][uuid] = @gt == true ? instance.as_json.merge(update) : instance.as_json.except('id').merge(update)
      end
      uuid
    end
    # rubocop:enable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

    def fetch_image(image_path, image_file_name)
      return if image_file_name.blank?

      return unless File.exist?(Rails.public_path.join('images', image_path, image_file_name)) # rubocop: disable Rails/RootPathnameMethods

      @images << File.join('images', image_path, image_file_name)
    end

    def uuid(type, id)
      return nil if id.nil?

      # create an empty hash for the type if it does not exist yet
      @uuids[type] = {} unless @uuids.key?(type)
      # create an uuid for the id if it does not exist yet
      @uuids[type][id] = SecureRandom.uuid unless @uuids[type].key?(id)
      @uuids[type][id]
    end

    def uuid?(type, id)
      @uuids.key?(type) and @uuids[type].key?(id)
    end
  end
end

# rubocop:enable Metrics/MethodLength, Metrics/ClassLength, Performance/MethodObjectAsBlock
# rubocop:enable Metrics/AbcSize
