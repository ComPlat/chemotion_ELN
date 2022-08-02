# frozen_string_literal: true

require 'json'

module Import
  class ImportCollections
    def initialize(att, current_user_id, gt = false, col_id = nil, origin = nil)
      @att = att
      @current_user_id = current_user_id
      @gt = gt
      @origin = origin
      @data = nil
      @instances = {}
      @attachments = []
      @col_id = col_id
      @col_all = Collection.get_all_collection_for_user(current_user_id)
      @images = {}
      @svg_files = []
    end

    def extract
      attachments = []
      att = Tempfile.new(encoding: 'ascii-8bit')
      att.write(@att.read_file)
      att.rewind
      Zip::File.open(att.path) do |zip_file|
        # Handle entries one by one
        zip_file.each do |entry|
          data = entry.get_input_stream.read.force_encoding('UTF-8')
          case entry.name
          when 'export.json'
            @data = JSON.parse(data)
          when %r{attachments/([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})}
            attachment = Attachment.create!(
              file_data: data,
              transferred: true,
              created_by: @current_user_id,
              created_for: @current_user_id,
              filename: Regexp.last_match(1)
            )
            attachments << attachment
          when %r{^images/(samples|reactions|molecules|research_plans)/(\w{1,128}\.\w{1,4})}
            tmp_file = Tempfile.new
            tmp_file.write(data)
            tmp_file.rewind
            @images["#{Regexp.last_match(1)}/#{Regexp.last_match(2)}"] = tmp_file
          end
        end
      end
      @attachments = attachments.map(&:id)
      attachments = []
      att.close!
    rescue StandardError => e
      # destroy created attachments, uploaded zip and tmp files if extraction fails
      attachments.map(&:destroy)
      cleanup
      raise e
    end

    def import
      ActiveRecord::Base.transaction do
        gate_collection if @gt == true
        import_collections if @gt == false
        import_samples
        import_residues
        import_reactions
        import_reactions_samples
        import_wellplates if @gt == false
        import_wells if @gt == false
        import_screens if @gt == false
        import_research_plans if @gt == false
        import_containers
        import_segments
        import_attachments
        import_literals
      end
    end

    def import!
      import
    rescue StandardError => e
      # destroy created attachments if import fails
      Attachment.where(id: @attachments).destroy_all
      raise e
    ensure
      # destroy created uploaded zip and tmp files if extraction fails
      cleanup
    end

    # desc: to destroy uploaded zip and sweep image tmp files
    def cleanup
      # @att.destroy!
      @images.each_value do |tmp_file|
        tmp_file.close
        tmp_file.unlink
      end
    end

    private

    def import_collections
      @data.fetch('Collection', {}).each do |uuid, fields|
        # create the collection
        collection = Collection.create!(fields.slice(
          'label',
          'sample_detail_level',
          'reaction_detail_level',
          'wellplate_detail_level',
          'screen_detail_level',
          'researchplan_detail_level',
          'created_at',
          'updated_at'
        ).merge(
          user_id: @current_user_id,
          parent: fetch_ancestry('Collection', fields.fetch('ancestry'))
        ))

        # add collection to @instances map
        update_instances!(uuid, collection)
      end
    end

    def gate_collection
      collection = Collection.find(@col_id)
      @uuid = nil
      @data.fetch('Collection', {}).each do |uuid, fields|
        @uuid = uuid
      end
      update_instances!(@uuid, collection)
    end

    def fetch_bound(value)
      bounds = value.to_s.split(/\.{2,3}/)
      lower = BigDecimal(bounds[0])
      upper = BigDecimal(bounds[1])
      if lower == -Float::INFINITY && upper == Float::INFINITY
        Range.new(-Float::INFINITY, Float::INFINITY, '()')
      else
        Range.new(lower, upper)
      end
    end

    def import_samples
      @data.fetch('Sample', {}).each do |uuid, fields|
        # look for the molecule_name
        molecule_name_uuid = fields.fetch('molecule_name_id')
        molecule_name_name = @data.fetch('MoleculeName').fetch(molecule_name_uuid).fetch('name') if molecule_name_uuid.present?

        # look for the molecule for this sample and add the molecule name
        # neither the Molecule or the MoleculeName are created if they already exist
        molfile = fields.fetch('molfile')
        molecule = fields.fetch('decoupled', nil) && molfile.blank? ? Molecule.find_or_create_dummy : Molecule.find_or_create_by_molfile(molfile)
        molecule.create_molecule_name_by_user(molecule_name_name, @current_user_id) unless (fields.fetch('decoupled', nil) && molfile.blank?) || molecule_name_name.blank?

        # get the molecule_name from the list of molecule names in molecule
        # this seems a bit cumbersome, but fits in with the methods of Molecule and MoleculeName
        molecule_name = molecule.molecule_names.find_by(name: molecule_name_name) unless fields.fetch('decoupled', nil) && molfile.blank?

        # create the sample
        sample = Sample.create!(fields.slice(
          'name',
          'target_amount_value',
          'target_amount_unit',
          'description',
          'molfile',
          'molfile_version',
          'purity',
          'solvent',
          'impurities',
          'location',
          'is_top_secret',
          'external_label',
          'short_label',
          'real_amount_value',
          'real_amount_unit',
          'imported_readout',
          'identifier',
          'density',
          'xref',
          'stereo',
          'created_at',
          'updated_at',
          'decoupled',
          'molecular_mass',
          'sum_formula'
        ).merge(
          created_by: @current_user_id,
          collections: fetch_many(
            'Collection', 'CollectionsSample', 'sample_id', 'collection_id', uuid
          ),
          molecule_name: molecule_name,
          sample_svg_file: fetch_image('samples', fields.fetch('sample_svg_file')),
          parent: fetch_ancestry('Sample', fields.fetch('ancestry')),
          melting_point: fetch_bound(fields.fetch('melting_point')),
          boiling_point: fetch_bound(fields.fetch('boiling_point')),
          molecule_id: molecule&.id
        ))


        solvent_value = fields.slice('solvent')['solvent']
        if solvent_value.is_a? String
          solvent = Chemotion::SampleConst.solvents_smiles_options.find { |s| s[:label].include?(solvent_value) }
          sample['solvent'] = [{ label: solvent[:value][:external_label], smiles: solvent[:value][:smiles], ratio: '100' }] if solvent.present?
        end

        # for same sample_svg_file case
        s_svg_file = @svg_files.select { |s| s[:sample_svg_file] == fields.fetch('sample_svg_file') }.first
        @svg_files.push(sample_svg_file: fields.fetch('sample_svg_file'), svg_file: sample.sample_svg_file) if s_svg_file.nil?
        sample.sample_svg_file = s_svg_file[:svg_file] unless s_svg_file.nil?

        # keep orig eln info
        if @gt == true
          et = sample.tag
          eln_info = {
            id: fields["id"],
            short_label: fields["short_label"],
            origin: @origin
          }
          et.update!(
            taggable_data: (et.taggable_data || {}).merge(eln_info: eln_info)
          )
        end

        # add sample to the @instances map
        update_instances!(uuid, sample)
      end
    end

    def import_residues
      @data.fetch('Residue', {}).each do |uuid, fields|
        # create the sample
        residue = Residue.create!(fields.slice(
          'residue_type',
          'custom_info',
          'created_at',
          'updated_at'
        ).merge(
          sample: @instances.fetch('Sample').fetch(fields.fetch('sample_id'))
        ))

        # add reaction to the @instances map
        update_instances!(uuid, residue)
      end
    end

    def import_reactions
      @data.fetch('Reaction', {}).each do |uuid, fields|
        # create the sample
        reaction = Reaction.create!(fields.slice(
          'name',
          'description',
          'timestamp_start',
          'timestamp_stop',
          'observation',
          'purification',
          'dangerous_products',
          'conditions',
          'tlc_solvents',
          'tlc_description',
          'rf_value',
          'temperature',
          'status',
          'solvent',
          'short_label',
          'role',
          'origin',
          'duration',
          'created_at',
          'updated_at'
        ).merge(
          created_by: @current_user_id,
          collections: fetch_many(
            'Collection', 'CollectionsReaction', 'reaction_id', 'collection_id', uuid
          )
        ))

        # add reaction to the @instances map
        update_instances!(uuid, reaction)

        # create the root container like with samples
        reaction.container = Container.create_root_container

        # overwrite with the image from the import, this needs to be at the end
        # because otherwise Reaction:update_svg_file! would create an empty image again
        reaction.reaction_svg_file = fetch_image('reactions', fields.fetch('reaction_svg_file'))

        # save the instance again
        reaction.save!
      end
    end

    def import_reactions_samples
      [
        ReactionsStartingMaterialSample,
        ReactionsSolventSample,
        ReactionsPurificationSolventSample,
        ReactionsReactantSample,
        ReactionsProductSample
      ].each do |model|
        @data.fetch(model.name, {}).each do |uuid, fields|
          # create the reactions_sample
          reactions_sample = model.create!(fields.slice(
            'reference',
            'equivalent',
            'position',
            'waste',
            'coefficient'
          ).merge(
            reaction: @instances.fetch('Reaction').fetch(fields.fetch('reaction_id')),
            sample: @instances.fetch('Sample').fetch(fields.fetch('sample_id'))
          ))

          # add reactions_sample to the @instances map
          update_instances!(uuid, reactions_sample)
        end
      end
    end

    def import_wellplates
      @data.fetch('Wellplate', {}).each do |uuid, fields|
        # create the wellplate
        wellplate = Wellplate.create!(fields.slice(
          'name',
          'size',
          'created_at',
          'updated_at'
        ).merge(
          collections: fetch_many(
            'Collection', 'CollectionsWellplate', 'wellplate_id', 'collection_id', uuid
          )
        ))

        # create the root container like with samples
        wellplate.container = Container.create_root_container
        wellplate.save!

        # add reaction to the @instances map
        update_instances!(uuid, wellplate)
      end
    end

    def import_wells
      @data.fetch('Well', {}).each do |uuid, fields|
        # create the well
        well = Well.create!(fields.slice(
          'position_x',
          'position_y',
          'readout',
          'additive',
          'created_at',
          'updated_at'
        ).merge(
          wellplate: @instances.fetch('Wellplate').fetch(fields.fetch('wellplate_id')),
          sample: @instances.fetch('Sample').fetch(fields.fetch('sample_id'), nil)
        ))

        # add reaction to the @instances map
        update_instances!(uuid, well)
      end
    end

    def import_screens
      @data.fetch('Screen', {}).each do |uuid, fields|
        # create the screen
        screen = Screen.create!(fields.slice(
          'description',
          'ops',
          'name',
          'result',
          'collaborator',
          'conditions',
          'requirements',
          'created_at',
          'updated_at'
        ).merge(
          collections: fetch_many(
            'Collection', 'CollectionsScreen', 'screen_id', 'collection_id', uuid
          ),
          wellplates: fetch_many(
            'Wellplate', 'ScreensWellplate', 'screen_id', 'wellplate_id', uuid
          )
        ))

        # create the root container like with samples
        screen.container = Container.create_root_container
        screen.save!

        # add reaction to the @instances map
        update_instances!(uuid, screen)
      end
    end

    def import_research_plans
      @data.fetch('ResearchPlan', {}).each do |uuid, fields|
        # create the research_plan
        research_plan = ResearchPlan.create!(fields.slice(
          'name',
          'description',
          'body',
          'created_at',
          'updated_at'
        ).merge(
          created_by: @current_user_id,
          collections: fetch_many(
            'Collection', 'CollectionsResearchPlan', 'research_plan_id', 'collection_id', uuid
          )
        ))

        # add reaction to the @instances map
        update_instances!(uuid, research_plan)
      end
    end

    def import_containers
      begin
        @data.fetch('Container', {}).each do |uuid, fields|
          case fields.fetch('container_type')
          when 'root', nil
            # the root container was created when the containable was imported
            containable_type = fields.fetch('containable_type')
            containable_uuid = fields.fetch('containable_id')
            containable = @instances.fetch(containable_type).fetch(containable_uuid)
            container = containable.container
          when 'analyses'
            # get the analyses container from its parent (root) container
            parent = @instances.fetch('Container').fetch(fields.fetch('parent_id'))
            container = parent.children.where("container_type = 'analyses'").first
          else
            # get the parent container
            parent = @instances.fetch('Container').fetch(fields.fetch('parent_id'))

            # create the container
            container = parent.children.create!(fields.slice(
                                                  'containable_type',
                                                  'name',
                                                  'container_type',
                                                  'description',
                                                  'extended_metadata',
                                                  'created_at',
                                                  'updated_at'
                                                ))
          end

          # in any case, add container to the @instances map
          update_instances!(uuid, container)
        end
      rescue StandardError => err
        Rails.logger.debug(err.backtrace)
        raise
      end
    end

    def import_attachments
      begin
        primary_store = Rails.configuration.storage.primary_store
        @data.fetch('Attachment', {}).each do |uuid, fields|
          # get the attachable for this attachment
          attachable_type = fields.fetch('attachable_type')
          attachable_uuid = fields.fetch('attachable_id')

          if attachable_type == 'SegmentProps'
            attachable = @instances.fetch('Segment').fetch(attachable_uuid)
            attachment = Attachment.where(id: @attachments, filename: fields.fetch('identifier')).first

            attachment.update!(
              attachable_id: attachable.id,
              attachable_type: 'SegmentProps',
              transferred: true,
              aasm_state: fields.fetch('aasm_state'),
              filename: fields.fetch('filename'),
              content_type: fields.fetch('content_type'),
              storage: primary_store
              # checksum: fields.fetch('checksum'),
              # created_at: fields.fetch('created_at'),
              # updated_at: fields.fetch('updated_at')
            )

            properties = attachable.properties
            properties['layers'].keys.each do |key|

              layer = properties['layers'][key]
              field_uploads = layer['fields'].select { |ss| ss['type'] == 'upload' }
              field_uploads&.each do |upload|
                idx = properties['layers'][key]['fields'].index(upload)
                files = upload["value"] && upload["value"]["files"]
                files&.each_with_index do |fi, fdx|
                  if properties['layers'][key]['fields'][idx]['value']['files'][fdx]['uid'] == fields.fetch('identifier')
                    properties['layers'][key]['fields'][idx]['value']['files'][fdx]['aid'] = attachment.id
                    properties['layers'][key]['fields'][idx]['value']['files'][fdx]['uid'] = attachment.identifier
                  end
                end
              end
            end
            attachable.update!(properties: properties)

          else
            attachable = @instances.fetch(attachable_type).fetch(attachable_uuid)
            attachment = Attachment.where(id: @attachments, filename: fields.fetch('identifier')).first

            attachment.update!(
              attachable: attachable,
              transferred: true,
              aasm_state: fields.fetch('aasm_state'),
              filename: fields.fetch('filename'),
              content_type: fields.fetch('content_type'),
              storage: primary_store
              # checksum: fields.fetch('checksum'),
              # created_at: fields.fetch('created_at'),
              # updated_at: fields.fetch('updated_at')
            )
          end

          # TODO: if attachment.checksum != fields.fetch('checksum')

          # add attachment to the @instances map
          update_instances!(uuid, attachment)
          attachment.regenerate_thumbnail

        end
      rescue StandardError => err
        Rails.logger.debug(err.backtrace)
        raise
      end
    end

    def import_segments
      begin
        @data.fetch('Segment', {}).each do |uuid, fields|
          klass_id = fields["segment_klass_id"]
          sk_obj = @data.fetch('SegmentKlass', {})[klass_id]
          sk_id = sk_obj["identifier"]
          ek_obj = @data.fetch('ElementKlass').fetch(sk_obj["element_klass_id"])
          element_klass = ElementKlass.find_by(name: ek_obj['name']) if ek_obj.present?
          next if element_klass.nil? || ek_obj.nil? || ek_obj['is_generic'] == true
          element_uuid = fields.fetch('element_id')
          element_type = fields.fetch('element_type')
          element = @instances.fetch(element_type).fetch(element_uuid)
          segment_klass = SegmentKlass.find_by(identifier: sk_id)
          next if @gt == true && segment_klass.nil?

          segment_klass = SegmentKlass.create!(sk_obj.slice(
              'label',
              'desc',
              'properties_template',
              'is_active',
              'place',
              'properties_release',
              'uuid',
              'identifier',
              'sync_time'
            ).merge(
              element_klass: element_klass,
              created_by: @current_user_id,
              released_at: DateTime.now
            )
          ) if segment_klass.nil?
          segment = Segment.create!(
            fields.slice(
              'properties',
              'created_at',
              'updated_at'
            ).merge(
              created_by: @current_user_id,
              element: element,
              segment_klass: segment_klass,
              uuid: SecureRandom.uuid,
              klass_uuid: segment_klass.uuid
            )
          )
          properties = segment.properties
          properties['layers'].keys.each do |key|
            layer = properties['layers'][key]

            field_molecules = layer['fields'].select { |ss| ss['type'] == 'drag_molecule' }
            field_molecules.each do |field|
              idx = properties['layers'][key]['fields'].index(field)
              id = field["value"] && field["value"]["el_id"] unless idx.nil?
              mol = Molecule.find_or_create_by_molfile(@data.fetch('Molecule')[id]['molfile']) unless id.nil?
              unless mol.nil?
                properties['layers'][key]['fields'][idx]['value']['el_id'] = mol.id
                properties['layers'][key]['fields'][idx]['value']['el_tip'] = "#{mol.inchikey}@@#{mol.cano_smiles}"
                properties['layers'][key]['fields'][idx]['value']['el_label'] = mol.iupac_name
              end
            end
          end

          update_instances!(uuid, segment)
        end
      rescue StandardError => error
        Rails.logger.error(error.backtrace)
        raise
      end
    end

    def import_literals
      @data.fetch('Literal', {}).each do |uuid, fields|
        # get the element for this literal
        element_type = fields.fetch('element_type')
        element_uuid = fields.fetch('element_id')
        element = @instances.fetch(element_type).fetch(element_uuid)

        # get the literature for this literal
        literature_uuid = fields.fetch('literature_id')
        literature_fields = @data.fetch('Literature').fetch(literature_uuid)

        # create the literature if it was not imported before
        begin
          literature =  @instances.fetch('Literature').fetch(literature_uuid)
        rescue KeyError => e
          # create the literature
          literature = Literature.create!(literature_fields.slice(
                                            'title',
                                            'url',
                                            'refs',
                                            'doi',
                                            'created_at',
                                            'updated_at'
                                          ))

          # add literature to the @instances map
          update_instances!(literature_uuid, literature)
        end

        # create the literal
        literal = Literal.create!(
          fields.slice(
            'element_type',
            'category',
            'created_at',
            'updated_at'
          ).merge(
            user_id: @current_user_id,
            element: element,
            literature: literature
          )
        )

        # add literal to the @instances map
        update_instances!(uuid, literal)
      end
    end

    def fetch_ancestry(type, ancestry)
      unless ancestry.nil? || ancestry.empty?
        parents = ancestry.split('/')
        parent_uuid = parents[-1]
        @instances.fetch(type, {}).fetch(parent_uuid, nil)
      end
    end

    def fetch_image(image_path, image_file_name)
      begin
        svg = nil
        if image_file_name.present? && (tmp_file = @images["#{image_path}/#{image_file_name}"])
          svg = tmp_file.read if tmp_file && !tmp_file.closed?
        end
      rescue StandardError => e
        Rails.logger.error e
      ensure
        tmp_file.close! if tmp_file && !tmp_file.closed?
      end
      svg || image_file_name
    end

    def update_instances!(uuid, instance)
      if instance.respond_to?(:collections)
        instance.collections << @col_all unless @col_all.nil?
        instance.save!
      end

      type = instance.class.name
      @instances[type] = {} unless @instances.key?(type)

      @instances[type][uuid] = instance
    end

    # Follows a has_many relation to `foreign_type` through `association_type`
    def fetch_many(foreign_type, association_type, local_field, foreign_field, local_id)
      associations = []
      @data.fetch(association_type, {}).each do |_uuid, fields|
        next unless fields.fetch(local_field) == local_id

        foreign_id = fields.fetch(foreign_field)
        instance = @instances.fetch(foreign_type, {}).fetch(foreign_id, nil)
        associations << instance unless instance.nil?
      end
      associations
    end
  end
end
