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
      end
    end

    def import_collections
      @data['Collection'].each do |uuid, fields|
        # create the collection
        collection = Collection.new(fields)
        collection.save!

        # add sample to collection map
        instances!(uuid, collection)
      end
    end

    def import_samples
      @data['Sample'].each do |uuid, fields|
        # look for the collection for this sample
        collections_sample = find_association('CollectionsSample', 'sample_id', uuid)
        collection = instance('Collection', collections_sample['collection_id'])

        # create the sample
        sample = Sample.new(fields.except(
          "molecule_id",
          "sample_svg_file",
          "user_id",
          "fingerprint_id",
          "molarity_value",
          "molarity_unit",
          "molecule_name_id",
          "molfile_version"
        ))
        sample.collections = [collection]
        sample.save!

        # add sample to instances map
        instances!(uuid, sample)
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
