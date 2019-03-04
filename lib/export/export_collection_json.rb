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

          # fetch containers, attachments and literature
          fetch_containers(sample)
          fetch_literals(sample)
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

          # fetch containers, attachments and literature
          fetch_containers(reaction)
          fetch_literals(reaction)
        end

        # fetch wellplates
        fetch_many(collection.wellplates)
        fetch_many(collection.collections_wellplates, {
          :collection_id => 'collections',
          :wellplate_id => 'wellplates',
        })

        # fetch containers and attachments
        collection.wellplates.each do |wellplate|
          fetch_containers(wellplate)
        end

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

          # fetch containers and attachments
          fetch_containers(screen)
        end

        # fetch research_plans
        fetch_many(collection.research_plans)
        fetch_many(collection.collections_research_plans, {
          :collection_id => 'collections',
          :research_plan_id => 'research_plans',
        })

        # loop over research plans and fetch research plan properties
        collection.research_plans.each do |research_plan|
          # fetch attachments
          # attachments are directrly related to research plans so we don't need fetch_containers
          fetch_many(research_plan.attachments, {
            :attachable_id => 'research_plans',
          })

          # fetch literature
          fetch_literals(research_plan)
        end
      end
      self
    end

    def fetch_collections
      collections = Collection.find(@collection_ids)
      fetch_many(collections)
      collections
    end

    def fetch_containers(containable)
      containable_table = containable.class.table_name

      # fetch root container
      root_container = containable.container
      fetch_one(containable.container, {
        :containable_id => containable_table,
        :parent_id => 'containers',
      })

      # fetch analyses container
      analyses_container = root_container.children.where("container_type = 'analyses'").first()
      fetch_one(analyses_container, {
        :containable_id => containable_table,
        :parent_id => 'containers',
      })

      # fetch analysis_containers
      analysis_containers = analyses_container.children.where("container_type = 'analysis'")
      analysis_containers.each do |analysis_container|
        fetch_one(analysis_container, {
          :containable_id => containable_table,
          :parent_id => 'containers',
        })

        # fetch attachment containers and attachments
        attachment_containers = analysis_container.children.where("container_type = 'dataset'")
        attachment_containers.each do |attachment_container|
          fetch_one(attachment_container, {
            :containable_id => containable_table,
            :parent_id => 'containers',
          })
          fetch_many(attachment_container.attachments, {
            :attachable_id => 'containers',
          })
        end
      end
    end

    def fetch_literals(element)
      element_type = element.class.name
      element_table = element.class.table_name

      # a manual query needed since there is no Active Record Associations available
      literals = Literal.where("element_id = ? AND element_type = ?", element.id, element_type)
      literals.each do |literal|
        fetch_one(literal.literature)
        fetch_one(literal, {
          :literature_id => 'literatures',
          :element_id => element_table,
        })
      end
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
      unless id.nil?
        # create an empty hash for the table_name if it does not exist yet
        unless @uuids.key?(table_name)
          @uuids[table_name] = {}
        end

        # create an uuid for the id if it does not exist yet
        unless @uuids[table_name].key?(id)
          @uuids[table_name][id] = SecureRandom.uuid
        end

        @uuids[table_name][id]
      else
        nil # return nil
      end
    end

    def uuid?(table_name, id)
      @uuids.key?(table_name) and @uuids[table_name].key?(id)
    end

  end
end
