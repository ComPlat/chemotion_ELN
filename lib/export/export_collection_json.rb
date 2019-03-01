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

      # debug output
      unless Rails.env.production?
        File.write('public/json/data.json', @data.to_json())
        File.write('public/json/uuid.json', @uuids.to_json())
      end
    end

    def prepare_data
      # loop over all collections
      fetch_collections.each do |collection|

        # fetch samples
        fetch_many(collection.samples, {
          :molecule_name_id => 'molecule_names',
          :molecule_id => 'molecules',
        })
        fetch_many(collection.collections_samples, {
          :collection_id => 'collections',
          :sample_id => 'samples',
        })

        # loop over samples and fetch sample properties
        collection.samples.each do |sample|
          fetch_one(sample.fingerprint)
          fetch_one(sample.molecule)
          fetch_one(sample.molecule_name, {
            :molecule_id => 'molecules',
          })
          fetch_one(sample.well, {
            :sample_id => 'samples',
            :wellplate_id => 'wellplates',
          })
          fetch_many(sample.residues, {
            :sample_id => 'samples',
          })

          # fetch containers and attachments
          fetch_one(sample.container, {
            :containable_id => 'samples',
          })
          fetch_many(sample.container.attachments, {
            :attachable_id => 'containers',
          })

          # fetch literals
          # a manual query needed since there is no Active Record Associations available
          literals = Literal.where("element_id = ? AND element_type = 'Sample'", sample.id)
          literals.each do |literal|
            fetch_one(literal.literature)
            fetch_one(literal, {
              :literature_id => 'literatures',
              :element_id => 'samples',
            })
          end
        end

        # fetch reactions
        fetch_many(collection.reactions)
        fetch_many(collection.collections_reactions, {
          :collection_id => 'collections',
          :reaction_id => 'reactions',
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
              :reaction_id => 'reactions',
              :sample_id => 'samples',
            })
          end

          # fetch containers and attachments
          fetch_one(reaction.container, {
            :containable_id => 'samples',
          })
          fetch_many(reaction.container.attachments, {
            :attachable_id => 'containers',
          })

          # fetch literals
          # a manual query needed since there is no Active Record Associations available
          literals = Literal.where("element_id = ? AND element_type = 'Reaction'", reaction.id)
          literals.each do |literal|
            fetch_one(literal.literature)
            fetch_one(literal, {
              :literature_id => 'literatures',
              :element_id => 'reactions',
            })
          end
        end

        # fetch wellplates
        fetch_many(collection.wellplates)
        fetch_many(collection.collections_wellplates, {
          :collection_id => 'collections',
          :wellplate_id => 'wellplates',
        })

        # fetch screens
        fetch_many(collection.screens)
        fetch_many(collection.collections_screens, {
          :collection_id => 'collections',
          :screen_id => 'screens',
        })

        # loop over screens and fetch screen properties
        collection.screens.each do |screen|
          # fetch relation between wellplates_screens and screen
          fetch_many(screen.screens_wellplates, {
            :screen_id => 'screens',
            :wellplate_id => 'wellplates',
          })
        end

        # fetch research_plans
        fetch_many(collection.research_plans)
        fetch_many(collection.collections_research_plans, {
          :collection_id => 'collections',
          :research_plan_id => 'research_plans',
        })

        # loop over research plans and fetch research plan properties
        collection.research_plans.each do |research_plan|
          # fetch literals
          # a manual query needed since there is no Active Record Associations available
          literals = Literal.where("element_id = ? AND element_type = 'ResearchPlan'", research_plan.id)
          literals.each do |literal|
            fetch_one(literal.literature)
            fetch_one(literal, {
              :literature_id => 'literatures',
              :element_id => 'research_plans',
            })
          end
        end
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
      unless instance.nil?
        # get the table_name from the class
        # IMPORTANT: these are strings, not symbols
        class_name = instance.class.name
        table_name = instance.class.table_name

        # get the uuid and only continue it does not exist yet
        uuid = uuid(table_name, instance.id)
        unless uuid?(table_name, uuid)
          # replace id and foreign_keys with uuids
          update = {:id => uuid}
          foreign_keys.each do |foreign_key, foreign_table|
            update[foreign_key] = uuid(foreign_table, instance.send(foreign_key))
          end

          # append updated json to @data
          @data << {
            :class => class_name,
            :table => table_name,
            :fields => instance.as_json().merge(update),
          }
        end
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
