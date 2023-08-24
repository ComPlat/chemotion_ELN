# frozen_string_literal: true

# rubocop:disable Metrics/AbcSize,Metrics/MethodLength,Metrics/BlockLength,Metrics/PerceivedComplexity,Metrics/CyclomaticComplexity, Layout/LineLength

require 'json'

module Import
  class ImportCollections # rubocop:disable Metrics/ClassLength
    def initialize(att, current_user_id, gate = false, col_id = nil, origin = nil) # rubocop:disable Style/OptionalBooleanParameter
      @att = att
      @current_user_id = current_user_id
      @gt = gate
      @origin = origin
      @data = nil
      @instances = {}
      @attachments = []
      @col_id = col_id
      @col_all = Collection.get_all_collection_for_user(current_user_id)
      @images = {}
      @svg_files = []
    end

    def execute
      extract
      import
      cleanup
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
          when %r{attachments/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})}
            file_name = entry.name.sub('attachments/', '')
            attachment = Attachment.new(
              transferred: true,
              con_state: Labimotion::ConState::NONE,
              created_by: @current_user_id,
              created_for: @current_user_id,
              key: SecureRandom.uuid,
              filename: file_name,
            )

            begin
              tmp = Tempfile.new(file_name)
              tmp.write(data)
              tmp.rewind

              attachment.file_path = tmp.path
              attachment.save!

              import_annotation(zip_file, entry, attachment)
              attachments << attachment
            ensure
              tmp.close
              tmp.unlink # deletes the temp file
            end
          when %r{^images/(samples|reactions|molecules|research_plans)/(\w{1,128}\.\w{1,4})}
            tmp_file = Tempfile.new
            tmp_file.write(data)
            tmp_file.rewind
            @images["#{Regexp.last_match(1)}/#{Regexp.last_match(2)}"] = tmp_file
          end
        end
      end
      update_researchplan_body(attachments)

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
        import_datasets
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

    def import_annotation(zip_file, entry, attachment)
      annotation_entry = zip_file.find_entry("#{entry.name}_annotation")
      return unless annotation_entry

      annotation_data = annotation_entry.get_input_stream.read.force_encoding('UTF-8')
      updater = Usecases::Attachments::Annotation::AnnotationUpdater.new

      annotation_data = annotation_data.gsub(
        %r{/api/v1/attachments/image/([0-9])*},
        "/api/v1/attachments/image/#{attachment.id}",
      )

      updater.update_annotation(annotation_data, attachment.id)
    end

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
          'updated_at',
        ).merge(
          user_id: @current_user_id,
          parent: fetch_ancestry('Collection', fields.fetch('ancestry')),
        ))

        # add collection to @instances map
        update_instances!(uuid, collection)
      end
    end

    def gate_collection
      collection = Collection.find(@col_id)
      @uuid = nil
      @data.fetch('Collection', {}).each do |uuid, _fields|
        @uuid = uuid
      end
      update_instances!(@uuid, collection)
    end

    def fetch_bound(value)
      bounds = value.to_s.split(/\.{2,3}/)
      return nil if bounds.blank?

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
        if molecule_name_uuid.present?
          molecule_name_name = @data.fetch('MoleculeName').fetch(molecule_name_uuid).fetch('name')
        end

        # look for the molecule for this sample and add the molecule name
        # neither the Molecule or the MoleculeName are created if they already exist
        molfile = fields.fetch('molfile')
        molecule = if fields.fetch('decoupled',
                                   nil) && molfile.blank?
                     Molecule.find_or_create_dummy
                   else
                     Molecule.find_or_create_by_molfile(molfile)
                   end
        unless (fields.fetch('decoupled', nil) && molfile.blank?) || molecule_name_name.blank?
          molecule.create_molecule_name_by_user(molecule_name_name, @current_user_id)
        end

        # get the molecule_name from the list of molecule names in molecule
        # this seems a bit cumbersome, but fits in with the methods of Molecule and MoleculeName
        unless fields.fetch('decoupled', nil) && molfile.blank?
          molecule_name = molecule.molecule_names.find_by(name: molecule_name_name)
        end

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
          'sum_formula',
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
          molecule_id: molecule&.id,
        ))

        solvent_value = fields.slice('solvent')['solvent']
        if solvent_value.is_a? String
          solvent = Chemotion::SampleConst.solvents_smiles_options.find { |s| s[:label].include?(solvent_value) }
          if solvent.present?
            sample['solvent'] =
              [{ label: solvent[:value][:external_label], smiles: solvent[:value][:smiles], ratio: '100' }]
          end
        end

        # for same sample_svg_file case
        s_svg_file = @svg_files.find { |s| s[:sample_svg_file] == fields.fetch('sample_svg_file') }
        if s_svg_file.nil?
          @svg_files.push(sample_svg_file: fields.fetch('sample_svg_file'), svg_file: sample.sample_svg_file)
        end

        sample.sample_svg_file = s_svg_file[:svg_file] unless s_svg_file.nil?

        # keep orig eln info
        if @gt == true
          et = sample.tag
          eln_info = {
            id: fields['id'],
            short_label: fields['short_label'],
            origin: @origin,
          }
          et.update!(
            taggable_data: (et.taggable_data || {}).merge(eln_info: eln_info),
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
          'updated_at',
        ).merge(
          sample: @instances.fetch('Sample').fetch(fields.fetch('sample_id')),
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
          'rxno',
          'origin',
          'duration',
          'created_at',
          'updated_at',
        ).merge(
          created_by: @current_user_id,
          collections: fetch_many(
            'Collection', 'CollectionsReaction', 'reaction_id', 'collection_id', uuid
          ),
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
        ReactionsProductSample,
      ].each do |model|
        @data.fetch(model.name, {}).each do |uuid, fields|
          # create the reactions_sample
          reactions_sample = model.create!(fields.slice(
            'reference',
            'equivalent',
            'position',
            'waste',
            'coefficient',
          ).merge(
            reaction: @instances.fetch('Reaction').fetch(fields.fetch('reaction_id')),
            sample: @instances.fetch('Sample').fetch(fields.fetch('sample_id')),
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
          'description',
          'short_label',
          'readout_titles',
          'created_at',
          'updated_at',
        ).merge(
          collections: fetch_many(
            'Collection', 'CollectionsWellplate', 'wellplate_id', 'collection_id', uuid
          ),
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
          'readouts',
          'label',
          'color_code',
          'additive',
          'created_at',
          'updated_at',
        ).merge(
          wellplate: @instances.fetch('Wellplate').fetch(fields.fetch('wellplate_id')),
          sample: @instances.fetch('Sample').fetch(fields.fetch('sample_id'), nil),
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
          'updated_at',
        ).merge(
          collections: fetch_many(
            'Collection', 'CollectionsScreen', 'screen_id', 'collection_id', uuid
          ),
          wellplates: fetch_many(
            'Wellplate', 'ScreensWellplate', 'screen_id', 'wellplate_id', uuid
          ),
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
          'updated_at',
        ).merge(
          created_by: @current_user_id,
          collections: fetch_many(
            'Collection', 'CollectionsResearchPlan', 'research_plan_id', 'collection_id', uuid
          ),
        ))

        # add reaction to the @instances map
        update_instances!(uuid, research_plan)
      end
    end

    def import_containers
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
                                                'updated_at',
                                              ))
        end
        # in any case, add container to the @instances map
        update_instances!(uuid, container)
      end
    rescue StandardError => e
      Rails.logger.debug(e.backtrace)
      raise
    end

    def import_attachments
      @data.fetch('Attachment', {}).each do |uuid, fields|
        # get the attachable for this attachment
        attachable_type = fields.fetch('attachable_type')
        attachable_uuid = fields.fetch('attachable_id')
        attachable = @instances.fetch(attachable_type).fetch(attachable_uuid)

        attachment = Attachment.where(
          'id IN (?) AND filename LIKE ? ',
          @attachments,
          fields.fetch('identifier') << '%',
        ).first

        attachment.update!(
          attachable: attachable,
          transferred: true,
          aasm_state: fields.fetch('aasm_state'),
          filename: fields.fetch('filename'),
          # checksum: fields.fetch('checksum'),
          # created_at: fields.fetch('created_at'),
          # updated_at: fields.fetch('updated_at')
        )
        # TODO: if attachment.checksum != fields.fetch('checksum')

        # add attachment to the @instances map
        update_instances!(uuid, attachment)
        # attachment.regenerate_thumbnail
      end
    rescue StandardError => e
      Rails.logger.debug(e.backtrace)
    end

    def import_segments
      Labimotion::Import.import_segments(@data, @instances, @gt, @current_user_id, &method(:update_instances!))
      # nil
    end

    def import_datasets
      Labimotion::Import.import_datasets(@data, @instances, @gt, @current_user_id, &method(:update_instances!))
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
        rescue KeyError => e # rubocop:disable Lint/UselessAssignment
          # create the literature
          literature = Literature.create!(literature_fields.slice(
                                            'title',
                                            'url',
                                            'refs',
                                            'doi',
                                            'created_at',
                                            'updated_at',
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
            'updated_at',
          ).merge(
            user_id: @current_user_id,
            element: element,
            literature: literature,
          ),
        )

        # add literal to the @instances map
        update_instances!(uuid, literal)
      end
    end

    def fetch_ancestry(type, ancestry)
      return if ancestry.blank?

      parents = ancestry.split('/')
      parent_uuid = parents[-1]
      @instances.fetch(type, {}).fetch(parent_uuid, nil)
    end

    def fetch_image(image_path, image_file_name)
      begin
        svg = nil
        if image_file_name.present? && (tmp_file = @images["#{image_path}/#{image_file_name}"]) && (tmp_file && !tmp_file.closed?)
          svg = tmp_file.read
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

    def update_researchplan_body(attachments)
      @data['ResearchPlan']&.each do |_attr_name, attr_value|
        image_fields = attr_value['body'].select { |i| i['type'] == 'image' }
        image_fields.each do |field|
          new_att = attachments.find { |i| i['filename'].include? field['value']['public_name'] }
          field['value']['public_name'] = new_att['identifier']
          field['value']['file_name'] = new_att['filename']
        end
      end
    end
  end
end
# rubocop:enable Metrics/AbcSize,Metrics/MethodLength,Metrics/BlockLength,Metrics/PerceivedComplexity,Metrics/CyclomaticComplexity, Layout/LineLength
