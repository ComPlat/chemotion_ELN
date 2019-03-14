module Export
  class ExportCollections

    # static methods
    class << self
      def file_path(export_id, format)
        File.join('public', format, "#{export_id}.#{format}")
      end
      def file_url(export_id, format)
        "/#{format}/#{export_id}.#{format}"
      end
      def lock_file_path(export_id, format)
        File.join('public', format, "#{export_id}.lock")
      end
    end

    def initialize(export_id, collection_ids, format, nested)
      @export_id = export_id
      @collection_ids = collection_ids
      @format = format
      @nested = nested

      @file_path = ExportCollections.file_path(export_id, format)
      @lock_file_path = ExportCollections.lock_file_path(export_id, format)

      @data = {}
      @uuids = {}
      @attachments = []
    end

    def to_json
      @data.to_json()
    end

    def to_file
      case @format
      when 'json'
        # write the json file public/json/
        File.write(@file_path, @data.to_json())

      when 'zip'
        # create a zip buffer
        zip = Zip::OutputStream.write_buffer do |zip|
          # write the json file into the zip file
          zip.put_next_entry File.join('data.json')
          zip.write @data.to_json()

          # write all attachemnts into an attachments directory
          @attachments.each do |attachment|
            zip.put_next_entry File.join('attachments', attachment.filename)
            zip.write attachment.read_file
          end
        end
        zip.rewind

        # write the zip file to public/zip/
        File.write(@file_path, zip.read)
      end
    end

    def prepare_data
      # get the collections from the database
      collections = Collection.find(@collection_ids)

      # add decendants for nested collections
      if @nested
        descendants = []
        Collection.find(@collection_ids).each do |collection|
          descendants += collection.descendants
        end
        collections += descendants
      end

      # loop over all collections
      collections.each do |collection|
        # fetch collection
        fetch_one(collection, {
          :user_id => 'User'
        })

        # fetch samples
        fetch_many(collection.samples, {
          :molecule_name_id => 'MoleculeName',
          :molecule_id => 'Molecule',
          :fingerprint_id => 'Fingerprint',
          :created_by => 'User',
          :user_id => 'User'
        })
        fetch_many(collection.collections_samples, {
          :collection_id => 'Collection',
          :sample_id => 'Sample'
        })

        # loop over samples and fetch sample properties
        collection.samples.each do |sample|
          fetch_one(sample.fingerprint)
          fetch_one(sample.molecule)
          fetch_one(sample.molecule_name, {
            :molecule_id => 'Molecule',
            :user_id => 'User'
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
        fetch_many(collection.reactions, {
          :created_by => 'User'
        })
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
        fetch_many(collection.research_plans, {
          :created_by => 'User'
        })
        fetch_many(collection.collections_research_plans, {
          :collection_id => 'Collection',
          :research_plan_id => 'ResearchPlan'
        })

        # loop over research plans and fetch research plan properties
        collection.research_plans.each do |research_plan|
          # fetch attachments
          # attachments are directrly related to research plans so we don't need fetch_containers
          fetch_many(research_plan.attachments, {
            :attachable_id => 'ResearchPlan',
            :created_by => 'User',
            :created_for => 'User'
          })

          # add attachments to the list of attachments
          @attachments += research_plan.attachments

          # fetch literature
          fetch_literals(research_plan)
        end
      end
    end

    def cleanup
      File.delete(@lock_file_path) if File.exist?(@lock_file_path)
    end

    private

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
            :parent_id => 'Container'
          })
          fetch_many(attachment_container.attachments, {
            :attachable_id => 'Container',
            :created_by => 'User',
            :created_for => 'User'
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
          :user_id => 'User'
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

          # replace ids in the ancestry field
          if instance.respond_to?('ancestry')
            ancestor_uuids = []
            instance.ancestor_ids.each do |ancestor_id|
              ancestor_uuids << uuid(type, ancestor_id)
            end
            update['ancestry'] = ancestor_uuids.join('/')
          end

          # check if deleted_at is nil
          if instance.respond_to?('deleted_at') and not instance.deleted_at.nil?
            raise 'Instance with non nil deleted_at in export'
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
