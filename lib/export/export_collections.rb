module Export
  class ExportCollections

    attr_reader :data
    attr_reader :uuids
    attr_reader :attachments

    def initialize
      @data = {}
      @uuids = {}
      @attachments = []
    end

    def to_json()
      @data.to_json()
    end

    def prepare_data(collection_ids)
      # loop over all collections
      fetch_collections(collection_ids).each do |collection|

        # fetch samples
        fetch_many(collection.samples, {
          :molecule_name_id => 'MoleculeName',
          :molecule_id => 'Molecule',
        })
        fetch_many(collection.collections_samples, {
          :collection_id => 'Collection',
          :sample_id => 'Sample',
        })

        # loop over samples and fetch sample properties
        collection.samples.each do |sample|
          fetch_one(sample.fingerprint)
          fetch_one(sample.molecule)
          fetch_one(sample.molecule_name, {
            :molecule_id => 'Molecule',
          })
          fetch_one(sample.well, {
            :sample_id => 'Sample',
            :wellplate_id => 'Wellplate',
          })
          fetch_many(sample.residues, {
            :sample_id => 'Sample',
          })

          # fetch containers, attachments and literature
          fetch_containers(sample)
          fetch_literals(sample)
        end

        # fetch reactions
        fetch_many(collection.reactions)
        fetch_many(collection.collections_reactions, {
          :collection_id => 'Collection',
          :reaction_id => 'Reaction',
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
              :reaction_id => 'Reaction',
              :sample_id => 'Sample',
            })
          end

          # fetch containers, attachments and literature
          fetch_containers(reaction)
          fetch_literals(reaction)
        end

        # fetch wellplates
        fetch_many(collection.wellplates)
        fetch_many(collection.collections_wellplates, {
          :collection_id => 'Collection',
          :wellplate_id => 'Wellplate',
        })

        # fetch containers and attachments
        collection.wellplates.each do |wellplate|
          fetch_containers(wellplate)
        end

        # fetch screens
        fetch_many(collection.screens)
        fetch_many(collection.collections_screens, {
          :collection_id => 'Collection',
          :screen_id => 'Screen',
        })

        # loop over screens and fetch screen properties
        collection.screens.each do |screen|
          # fetch relation between wellplates_screens and screen
          fetch_many(screen.screens_wellplates, {
            :screen_id => 'Screen',
            :wellplate_id => 'Wellplate',
          })

          # fetch containers and attachments
          fetch_containers(screen)
        end

        # fetch research_plans
        fetch_many(collection.research_plans)
        fetch_many(collection.collections_research_plans, {
          :collection_id => 'Collection',
          :research_plan_id => 'ResearchPlan',
        })

        # loop over research plans and fetch research plan properties
        collection.research_plans.each do |research_plan|
          # fetch attachments
          # attachments are directrly related to research plans so we don't need fetch_containers
          fetch_many(research_plan.attachments, {
            :attachable_id => 'ResearchPlan',
          })

          # add attachments to the list of attachments
          @attachments += research_plan.attachments

          # fetch literature
          fetch_literals(research_plan)
        end
      end
      self
    end

    def fetch_collections(collection_ids)
      collections = Collection.find(collection_ids)
      fetch_many(collections)
      collections
    end

    def fetch_containers(containable)
      containable_type = containable.class.name

      # fetch root container
      root_container = containable.container
      fetch_one(containable.container, {
        :containable_id => containable_type,
        :parent_id => 'Container',
      })

      # fetch analyses container
      analyses_container = root_container.children.where("container_type = 'analyses'").first()
      fetch_one(analyses_container, {
        :containable_id => containable_type,
        :parent_id => 'Container',
      })

      # fetch analysis_containers
      analysis_containers = analyses_container.children.where("container_type = 'analysis'")
      analysis_containers.each do |analysis_container|
        fetch_one(analysis_container, {
          :containable_id => containable_type,
          :parent_id => 'Container',
        })

        # fetch attachment containers and attachments
        attachment_containers = analysis_container.children.where("container_type = 'dataset'")
        attachment_containers.each do |attachment_container|
          fetch_one(attachment_container, {
            :containable_id => containable_type,
            :parent_id => 'Container',
          })
          fetch_many(attachment_container.attachments, {
            :attachable_id => 'Container',
          })

          # add attachments to the list of attachments
          @attachments += attachment_container.attachments
        end
      end
    end

    def fetch_literals(element)
      element_type = element.class.name

      # a manual query needed since there is no Active Record Associations available
      literals = Literal.where("element_id = ? AND element_type = ?", element.id, element_type)
      literals.each do |literal|
        fetch_one(literal.literature)
        fetch_one(literal, {
          :literature_id => 'Literature',
          :element_id => element_type,
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
          unless @data.key?(type)
            @data[type] = {}
          end

          @data[type][uuid] = instance.as_json().except('id').merge(update)
        end
      end
    end

    def uuid(type, id)
      unless id.nil?
        # create an empty hash for the type if it does not exist yet
        unless @uuids.key?(type)
          @uuids[type] = {}
        end

        # create an uuid for the id if it does not exist yet
        unless @uuids[type].key?(id)
          @uuids[type][id] = SecureRandom.uuid
        end

        @uuids[type][id]
      else
        nil # return nil
      end
    end

    def uuid?(type, id)
      @uuids.key?(type) and @uuids[type].key?(id)
    end

  end
end
