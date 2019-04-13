require 'json'

module Import
  class ImportCollections

    def initialize(import_id, current_user_id)
      @import_id = import_id
      @current_user_id = current_user_id

      @zip_file_path = File.join('tmp', 'import', "#{import_id}.zip")
      @directory = File.join('tmp', 'import', import_id)

      @data = nil
      @instances = {}
      @attachments = []
    end

    def extract()
      Zip::File.open(@zip_file_path) do |zip_file|
        zip_file.each do |f|
          fpath = File.join(@directory, f.name)
          fdir = File.dirname(fpath)

          FileUtils.mkdir_p(fdir) unless File.directory?(fdir)
          zip_file.extract(f, fpath) unless File.exist?(fpath)
        end
      end
    end

    def read
      # open and read the export.json
      file_name = File.join(@directory, 'export.json')
      File.open(file_name) do |f|
        @data = JSON.parse(f.read())
      end
    end

    def import
      ActiveRecord::Base.transaction do
        import_collections
        import_samples
        import_residues
        import_reactions
        import_reactions_samples
        import_wellplates
        import_wells
        import_screens
        import_research_plans
        import_containers
        import_attachments
        import_literals
      end
    end

    def cleanup
      File.delete(@zip_file_path) if File.exist?(@zip_file_path)
      FileUtils.remove_dir(@directory) if File.exist?(@directory)
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
        ).merge({
          :user_id => @current_user_id,
          :parent => fetch_ancestry('Collection', fields.fetch('ancestry'))
        }))

        # add collection to @instances map
        update_instances!(uuid, collection)
      end
    end

    def import_samples
      @data.fetch('Sample', {}).each do |uuid, fields|
        # look for the molecule_name
        molecule_name_uuid = fields.fetch('molecule_name_id')
        molecule_name_name = @data.fetch('MoleculeName').fetch(molecule_name_uuid).fetch('name')

        # look for the molecule for this sample and add the molecule name
        # neither the Molecule or the MoleculeName are created if they already exist
        molfile = fields.fetch('molfile')
        molecule = Molecule.find_or_create_by_molfile(molfile)
        molecule.create_molecule_name_by_user(molecule_name_name, @current_user_id)

        # get the molecule_name from the list of molecule names in molecule
        # this seems a bit cumbersome, but fits in with the methods of Molecule and MoleculeName
        molecule_name = molecule.molecule_names.find_by(name: molecule_name_name)

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
          'melting_point',
          'boiling_point',
          'xref',
          'stereo',
          'created_at',
          'updated_at'
        ).merge({
          :created_by => @current_user_id,
          :collections => fetch_many(
            'Collection', 'CollectionsSample', 'sample_id', 'collection_id', uuid),
          :molecule_name => molecule_name,
          :sample_svg_file => fetch_image('samples', fields.fetch('sample_svg_file')),
          :parent => fetch_ancestry('Sample', fields.fetch('ancestry'))
        }))

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
        ).merge({
          :sample => @instances.fetch('Sample').fetch(fields.fetch('sample_id'))
        }))

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
        ).merge({
          :created_by => @current_user_id,
          :collections => fetch_many(
            'Collection', 'CollectionsReaction', 'reaction_id', 'collection_id', uuid)
        }))

        # create the root container like with samples
        reaction.container = Container.create_root_container

        # overwrite with the image from the import, this needs to be at the end 
        # because otherwise Reaction:update_svg_file! would create an empty image again
        reaction.reaction_svg_file = fetch_reaction_image(fields.fetch('reaction_svg_file'))

        # save the instance again
        reaction.save!

        # add reaction to the @instances map
        update_instances!(uuid, reaction)
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
          ).merge({
            :reaction => @instances.fetch('Reaction').fetch(fields.fetch('reaction_id')),
            :sample => @instances.fetch('Sample').fetch(fields.fetch('sample_id'))
          }))

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
        ).merge({
          :collections => fetch_many(
            'Collection', 'CollectionsWellplate', 'wellplate_id', 'collection_id', uuid)
        }))

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
        ).merge({
          :wellplate => @instances.fetch('Wellplate').fetch(fields.fetch('wellplate_id')),
          :sample => @instances.fetch('Sample').fetch(fields.fetch('sample_id'), nil)
        }))

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
        ).merge({
          :collections => fetch_many(
            'Collection', 'CollectionsScreen', 'screen_id', 'collection_id', uuid),
          :wellplates => fetch_many(
            'Wellplate', 'ScreensWellplate', 'screen_id', 'wellplate_id', uuid)
        }))

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
          'sdf_file',
          'svg_file',
          'created_at',
          'updated_at'
        ).merge({
          :created_by => @current_user_id,
          :collections => fetch_many(
            'Collection', 'CollectionsResearchPlan', 'research_plan_id', 'collection_id', uuid),
          :svg_file => fetch_image('research_plans', fields.fetch('svg_file'))
        }))

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
      @data.fetch('Attachment', {}).each do |uuid, fields|
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
        literal = Literal.create!(
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

    def fetch_ancestry(type, ancestry)
      unless ancestry.nil? or ancestry.empty?
        parents = ancestry.split('/')
        parent_uuid = parents[-1]
        begin
          @instances.fetch(type).fetch(parent_uuid)
        rescue KeyError
          nil
        end
      end
    end

    def fetch_image(image_path, image_file_name)
      unless image_file_name.nil? or image_file_name.empty?
        import_file_path = File.join(@directory, 'images', image_file_name)

        if File.exists?(import_file_path)
          # copy extracted file from the import
          file_path = File.join('public', 'images', image_path, image_file_name)
          FileUtils.cp(import_file_path, file_path) unless File.exists?(file_path)

          image_file_name
        end
      end
    end

    def fetch_reaction_image(image_file_name)
      unless image_file_name.nil? or image_file_name.empty?
        import_file_path = File.join(@directory, 'images', image_file_name)

        if File.exists?(import_file_path)
          File.open(import_file_path) do |f|
            f.read()
          end
        end
      end
    end

    def update_instances!(uuid, instance)
      type = instance.class.name

      unless @instances.key?(type)
        @instances[type] = {}
      end

      @instances[type][uuid] = instance
    end

    # Follows a has_many relation to `foreign_type` through `association_type`
    def fetch_many(foreign_type, association_type, local_field, foreign_field, local_id)
      associations = []
      @data.fetch(association_type, {}).each do |uuid, fields|
        if fields.fetch(local_field) == local_id
          foreign_id = fields.fetch(foreign_field)
          instance = @instances.fetch(foreign_type, {}).fetch(foreign_id, nil)
          unless instance.nil?
            associations << instance
          end
        end
      end
      return associations
    end
  end
end
