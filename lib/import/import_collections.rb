require 'json'

module Import
  class ImportCollections

    def initialize(directory, file_name, current_user_id)
      @directory = directory
      @file_name = file_name
      @current_user_id = current_user_id

      @data = nil
      @instances = {}
      @attachments = []
    end

    def process
      extract
      read
      import
      self
    end

    def extract()
      file_path = File.join(@directory, @file_name)
      Zip::File.open(file_path) do |zip_file|
        zip_file.each do |f|
          fpath = File.join(@directory, f.name)
          fdir = File.dirname(fpath)

          FileUtils.mkdir_p(fdir) unless File.directory?(fdir)
          zip_file.extract(f, fpath) unless File.exist?(fpath)
        end
      end
    end

    def read
      # open and read the data.json
      file_name = File.join(@directory, 'data.json')
      File.open(file_name) do |f|
        @data = JSON.parse(f.read())
      end
    end

    def import
      ActiveRecord::Base.transaction do
        import_collections
        import_samples
        import_reactions

        import_containers
        import_attachments

        import_literature
      end
    end

    def import_collections
      @data.fetch('Collection', []).each do |uuid, fields|
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
        ).merge({
          :user_id => @current_user_id
        }))

        # add collection to @instances map
        update_instances!(uuid, collection)
      end
    end

    def import_samples
      @data.fetch('Sample', []).each do |uuid, fields|
        # get the collection for this sample
        collections_sample = fetch_association('CollectionsSample', 'sample_id', uuid)
        collection_uuid = collections_sample.fetch('collection_id')
        collection = @instances.fetch('Collection').fetch(collection_uuid)

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
          'real_amount_value',
          'real_amount_unit',
          'imported_readout',
          'identifier',
          'density',
          'melting_point',
          'boiling_point',
          'xref',
          'stereo',
          'created_at',
          'updated_at'
        ).merge({
          :created_by => @current_user_id,
          :collections => [collection]
        }))

        # add sample to the @instances map
        update_instances!(uuid, sample)
      end
    end

    def import_reactions
      @data.fetch('Reaction', []).each do |uuid, fields|
        # get the collection for this reaction
        collections_reaction = fetch_association('CollectionsReaction', 'reaction_id', uuid)
        collection_uuid = collections_reaction.fetch('collection_id')
        collection = @instances.fetch('Collection').fetch(collection_uuid)

        # create the sample
        reaction = Reaction.create!(fields.slice(
          'name',
          'description',
          'timestamp_start',
          'timestamp_stop',
          'observation',
          'purification',
          'dangerous_products',
          'tlc_solvents',
          'tlc_description',
          'rf_value',
          'temperature',
          'status',
          'solvent',
          # 'short_label',
          'role',
          'origin',
          'duration',
          'created_at',
          'updated_at'
        ).merge({
          :created_by => @current_user_id,
          :collections => [collection]
        }))

        # create the root container like with samples
        reaction.container = Container.create_root_container
        reaction.save!

        # add reaction to the @instances map
        update_instances!(uuid, reaction)
      end
    end

    def import_containers
      @data.fetch('Container', []).each do |uuid, fields|
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
          container = parent.children.where("container_type = 'analyses'").first()
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
    end

    def import_attachments
      @data.fetch('Attachment', []).each do |uuid, fields|
        # get the attachable for this attachment
        attachable_type = fields.fetch('attachable_type')
        attachable_uuid = fields.fetch('attachable_id')
        attachable = @instances.fetch(attachable_type).fetch(attachable_uuid)

        # construct file path
        file_path = File.join(@directory, 'attachments', fields.fetch('filename'))

        # create the attachment
        attachment = attachable.attachments.create!(
          file_path: file_path,
          created_by: @current_user_id,
          created_for: @current_user_id,
          bucket: attachable.id,
          filename: fields.fetch('filename'),
          checksum: fields.fetch('checksum'),
          content_type: fields.fetch('content_type'),
          created_at: fields.fetch('created_at'),
          updated_at: fields.fetch('updated_at')
        )

        # move the attachment to the primary store
        primary_store = Rails.configuration.storage.primary_store
        attachment.update!(storage: primary_store)

        # add attachment to the @instances map
        update_instances!(uuid, attachment)
      end
    end

    def import_literature
      @data.fetch('Literal', []).each do |uuid, fields|
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
        rescue KeyError => ex
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
        literal = Literal.new(
          fields.slice(
            'element_type',
            'category',
            'created_at',
            'updated_at'
          ).merge({
            :user_id => @current_user_id,
            :element => element,
            :literature => literature
          })
        )

        # add literal to the @instances map
        update_instances!(uuid, literal)
      end
    end

    def update_instances!(uuid, instance)
      type = instance.class.name

      unless @instances.key?(type)
        @instances[type] = {}
      end

      @instances[type][uuid] = instance
    end

    def fetch_association(association_type, foreign_key, id)
      @data.fetch(association_type).each do |uuid, fields|
        if fields.fetch(foreign_key) == id
          return fields
        end
      end
    end

  end
end
