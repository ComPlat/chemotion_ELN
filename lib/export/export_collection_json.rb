module Export
  class ExportCollectionJson

    def initialize(collection_ids)
      @collection_ids = collection_ids
      @uuids = {}
      @data = []
    end

    def to_json()
      @data.to_json()
    end

    def to_file(file_name)
      file_name += '.json' if File.extname(file_name) != '.json'
      File.write(file_name, to_json)
    end

    def prepare_data
      fetch_collections.each do |collection|
        fetch_many(collection.samples, {
          :molecule_name_id => :molecule_names,
          :molecule_id => :molecules,
        })
        fetch_many(collection.collections_samples, {
          :collection_id => :collections,
          :sample_id => :samples,
        })

        collection.samples.each do |sample|
          fetch_one(sample.molecule)
          fetch_one(sample.molecule_name, {
            :molecule_id => :molecules,
          })
        end

        fetch_many(collection.reactions)
        fetch_many(collection.collections_reactions, {
          :collection_id => :collections,
          :reaction_id => :reactions,
        })

        collection.reactions.each do |reaction|
          fetch_many(reaction.reactions_starting_material_samples, {
            :reaction_id => :reactions,
            :sample_id => :samples,
          })
          fetch_many(reaction.reactions_solvent_samples, {
            :reaction_id => :reactions,
            :sample_id => :samples,
          })
          fetch_many(reaction.reactions_reactant_samples, {
            :reaction_id => :reactions,
            :sample_id => :samples,
          })
          fetch_many(reaction.reactions_product_samples, {
            :reaction_id => :reactions,
            :sample_id => :samples,
          })
        end

        fetch_many(collection.wellplates)
        fetch_many(collection.collections_wellplates, {
          :collection_id => :collections,
          :wellplate_id => :wellplates,
        })

        fetch_many(collection.screens)
        fetch_many(collection.collections_screens, {
          :collection_id => :collections,
          :screen_id => :screens,
        })

        fetch_many(collection.research_plans)
        fetch_many(collection.collections_research_plans, {
          :collection_id => :collections,
          :research_plan_id => :research_plans,
        })
      end
      self
    end

    def fetch_collections
      collections = Collection.find(@collection_ids)
      fetch_many(collections)
      collections
    end

    def fetch_many(instances, foreign_keys = {})
      instances.each do |instance|
        fetch_one(instance, foreign_keys)
      end
    end

    def fetch_one(instance, foreign_keys = {})
      # get the table_name from the class
      class_name = instance.class.name
      table_name = instance.class.table_name

      # get the uuid and only continue it does not exist yet
      uuid = uuid(table_name, instance.id)
      unless uuid?(table_name, uuid)

        # create a hash to update the instance with
        update = {:class_name => class_name, :table_name => table_name, :id => uuid}

        # loop over foreign_keys and replace with uuids
        foreign_keys.each do |foreign_key, foreign_table|
          update[foreign_key] = uuid(foreign_table, instance.send(foreign_key))
        end

        # append updated json to @data
        @data << instance.as_json().merge(update)
      end
    end

    def uuid(table_name, id)
      # create an empty hash for the table_name if it does not exist yet
      unless @uuids.key?(table_name)
        @uuids[table_name] = {}
      end

      # create an uuid for the id if it does not exist yet
      unless @uuids[table_name].key?(id)
        @uuids[table_name][id] = SecureRandom.uuid
      end

      @uuids[table_name][id]
    end

    def uuid?(table_name, id)
      @uuids.key?(table_name) and @uuids[table_name].key?(id)
    end

  end
end
