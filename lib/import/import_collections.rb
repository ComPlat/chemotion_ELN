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

        import_containers
        import_attachments

        import_literature
      end
    end

    def import_collections
      @data['Collection'].each do |uuid, fields|
        # create the collection
        collection = Collection.new(fields)
        collection = Collection.new(fields.slice(
          "label",
          "sample_detail_level",
          "reaction_detail_level",
          "wellplate_detail_level",
          "screen_detail_level",
          "researchplan_detail_level",
          "created_at",
          "updated_at"
        ).merge({
          :user_id => @current_user_id
        }))
        collection.save!

        # add collection to @instances map
        instances!(uuid, collection)
      end
    end

    def import_samples
      @data['Sample'].each do |uuid, fields|
        # get the collection for this sample
        collections_sample = find_association('CollectionsSample', 'sample_id', uuid)
        collection = instance('Collection', collections_sample['collection_id'])

        # create the sample
        sample = Sample.new(fields.slice(
          "name",
          "target_amount_value",
          "target_amount_unit",
          "description",
          "molfile",
          "molfile_version",
          "purity",
          "solvent",
          "impurities",
          "location",
          "is_top_secret",
          "external_label",
          "real_amount_value",
          "real_amount_unit",
          "imported_readout",
          "identifier",
          "density",
          "melting_point",
          "boiling_point",
          "xref",
          "stereo",
          "created_at",
          "updated_at"
        ).merge({
          :created_by => @current_user_id
        }))
        sample.collections = [collection]
        sample.save!

        # add sample to the @instances map
        instances!(uuid, sample)
      end
    end

    def import_containers
      @data['Container'].each do |uuid, fields|
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
          container = parent.children.create(fields.slice(
            "containable_type",
            "name",
            "container_type",
            "description",
            "extended_metadata",
            "created_at",
            "updated_at"
          ))
        end

        # in any case, add container to the @instances map
        instances!(uuid, container)
      end
    end

    def import_attachments
      @data['Attachment'].each do |uuid, fields|
        # get the attachable for this attachment
        attachable_type = fields.fetch('attachable_type')
        attachable_uuid = fields.fetch('attachable_id')
        attachable = @instances.fetch(attachable_type).fetch(attachable_uuid)

        # construct file path
        file_path = File.join(@directory, 'attachments', fields.fetch('filename'))

        # create the attachment
        attachment = attachable.attachments.create(
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
        instances!(uuid, attachment)
      end
    end

    def import_literature
      @data['Literal'].each do |uuid, fields|
        # get the element for this literal
        element_type = fields.fetch('element_type')
        element_uuid = fields.fetch('element_id')
        element = @instances.fetch(element_type).fetch(element_uuid)

        # get the literature for this literal
        literature_uuid = fields.fetch('literature_id')
        literature_fields = @data.fetch('Literature').fetch(literature_uuid)

        # create the literature if it was not imported before
        literature = instance('Literature', literature_uuid)
        unless literature
          # create the literature
          literature = Literature.new(literature_fields.slice(
            "title",
            "url",
            "refs",
            "doi",
            "created_at",
            "updated_at"
          ))
          literature.save!

          # add literature to the @instances map
          instances!(literature_uuid, literature)
        end

        # create the literal
        literal = Literal.new(
          fields.slice(
            "element_type",
            "category",
            "created_at",
            "updated_at"
          ).merge({
            :user_id => @current_user_id
          })
        )
        literal.element = element
        literal.literature = literature
        literal.save!

        # add literal to the @instances map
        instances!(uuid, literal)
      end
    end

    def instances!(uuid, instance)
      class_name = instance.class.name

      unless @instances.key?(class_name)
        @instances[class_name] = {}
      end

      @instances[class_name][uuid] = instance
    end

    def find_association(association_model, id_field, id)
      @data[association_model].each do |uuid, fields|
        if fields[id_field] == id
          return fields
        end
      end
    end

    def instance(model, uuid)
      if !uuid.nil? and @instances.key?(model) and @instances[model].key?(uuid)
        return @instances[model][uuid]
      end
    end
  end
end
