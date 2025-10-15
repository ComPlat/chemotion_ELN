# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength, Metrics/AbcSize

module RecoveryDB
  module PartialMigration
    class RestoreUsers
      attr_reader :user_ids, :file

      SAMPLE_SECTIONS = %w[
        products
        reactants
        solvents
        startingMaterials
      ].freeze

      def initialize(user_ids: nil, file: nil)
        @user_ids = user_ids
        @file = file
        mount.restore_backup
        mount.load_models
      end

      def mount
        @mount ||= RecoveryDB::Mount.new(file: @file,
                                         tables: %w[users profiles collections samples reactions reactions_samples
                                                    wellplates wells screens research_plans device_descriptions
                                                    attachments containers container_hierarchies collections_samples
                                                    collections_reactions collections_wellplates collections_screens
                                                    collections_research_plans collections_device_descriptions
                                                    sync_collections_users users_devices devices collections_elements
                                                    elements element_klasses elements_elements elements_samples
                                                    segment_klasses segments user_labels users_admins users_groups
                                                    molecule_names inventories])
      end

      def run
        raise ArgumentError, 'User Ids are required' if @user_ids.nil?
        raise ActiveRecord::RecordNotFound, 'No user found' if rec_users.empty?

        user_id_map = {}
        created_elements = {}

        @mount.log_event "Restoring users: found #{rec_users.size} of #{@user_ids.size} user(s) to restore"
        restore_element_klasses(created_elements)
        rec_users.each do |recovery_user|
          ActiveRecord::Base.transaction do
            temp_elements = created_elements.deep_dup
            new_user = restore_user(recovery_user, temp_elements)
            user_id_map[recovery_user.id] = new_user.id
            created_elements.merge!(temp_elements) # Only keep them if all succeeded
          rescue StandardError => e
            Rails.logger.error("Restoring user #{recovery_user.id} failed: #{e.message}")
            raise ActiveRecord::Rollback
          end
        end

        restore_sharing_and_synchronization(user_id_map)
        restore_user_admin(user_id_map)
        restore_user_group(user_id_map)
        @mount.destroy!

        missing_user_ids = @user_ids - user_id_map.keys
        Rails.logger.info do
          msg = "#{user_id_map.size} of #{@user_ids.size} users restored."
          msg += " Missing user IDs: #{missing_user_ids.join(', ')}" unless missing_user_ids.empty?
          msg
        end
      end

      def restore_element_klasses(created_elements)
        element_klass_ids = RecoveryDB::Models::Element
                            .joins('INNER JOIN collections_elements ON collections_elements.element_id = elements.id')
                            .joins('INNER JOIN collections ON collections.id = collections_elements.collection_id')
                            .where(collections: { user_id: @user_ids })
                            .distinct
                            .pluck(:element_klass_id)

        old_element_klasses = RecoveryDB::Models::ElementKlass.where(id: element_klass_ids)
        old_element_klasses.find_each do |old_element_klass|
          next if created_elements.key?(['ElementKlass', old_element_klass.id])

          attributes = old_element_klass.attributes.except(*attributes_to_exclude)
          new_element_klass = Labimotion::ElementKlass.create!(attributes)
          element_klass_key = ['ElementKlass', old_element_klass.id]
          created_elements[element_klass_key] = new_element_klass.id
          restore_segment_klass(created_elements, old_element_klass.id, new_element_klass.id)
        end
      rescue ActiveRecord::ActiveRecordError => e
        Rails.logger.error "Failed to copy element klass #{element_klass_ids}: #{e.message}"
      end

      def restore_segment_klass(created_elements, old_element_klass_id, new_element_klass_id)
        old_segment_klasses = RecoveryDB::Models::SegmentKlass.where(element_klass_id: old_element_klass_id)
        old_segment_klasses.find_each do |old_segment_klass|
          next if created_elements.key?(['SegmentKlass', old_segment_klass.id])

          attributes = old_segment_klass.attributes.except(*attributes_to_exclude)
          attributes['element_klass_id'] = new_element_klass_id
          new_segment_klass = Labimotion::SegmentKlass.create!(attributes)
          segment_klass_key = ['SegmentKlass', old_segment_klass.id]
          created_elements[segment_klass_key] = new_segment_klass.id
        end
      end

      def restore_user(old_user, created_elements)
        user_attributes = old_user.attributes.except(*attributes_to_exclude)
        begin
          handle_name_abbreviation(user_attributes)
          new_user = User.new(user_attributes)
          # Skip validations (e.g. password) when restoring
          new_user.save!(validate: false)
          restore_profile(old_user, new_user)
          restore_user_label(old_user, new_user)
          restore_collections(old_user, new_user, created_elements)
          restore_sync_collection_users(
            new_user: new_user,
            old_user_id: old_user.id,
          )
          restore_elements_elements(created_elements, old_user, new_user)
          restore_elements_samples(created_elements, old_user, new_user)
          restore_devices(old_user, new_user)
          new_user
        rescue ActiveRecord::ActiveRecordError => e
          Rails.logger.error "Failed to copy user #{old_user.id}: #{e.message}"
          raise
        end
      end

      def handle_name_abbreviation(user_attributes)
        return unless User.find_by(name_abbreviation: user_attributes['name_abbreviation'])

        abbreviation_log_path = Rails.root.join('log/name_abbreviation_changes.log')
        old_abbreviation = user_attributes['name_abbreviation']
        new_abbreviation = create_unique_name_abbreviation(user_attributes)
        user_attributes['name_abbreviation'] = new_abbreviation
        # Log the change to a dedicated file
        File.open(abbreviation_log_path, 'a') do |file|
          file.puts "#{user_attributes['email']}: #{old_abbreviation} => #{new_abbreviation}"
        end
      end

      def create_unique_name_abbreviation(user_attributes)
        base_abbreviation = (user_attributes['last_name'][0] + user_attributes['first_name'][0]).upcase
        i = 1
        name_abbreviation = "#{base_abbreviation}#{i}"

        while User.find_by(name_abbreviation: name_abbreviation)
          i += 1
          name_abbreviation = "#{base_abbreviation}#{i}"
        end

        name_abbreviation
      end

      def restore_profile(old_user, new_user)
        old_profile = RecoveryDB::Models::Profile.find_by(user_id: old_user.id)
        return unless old_profile

        profile_attributes = old_profile.attributes.except(*attributes_to_exclude)
        begin
          Profile.create!(profile_attributes.merge(user_id: new_user.id))
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.error "Failed to copy profile for user #{old_user.id}: #{e.message}"
          raise
        end
      end

      def restore_user_label(old_user, new_user)
        old_label = RecoveryDB::Models::UserLabel.find_by(user_id: old_user.id)
        return unless old_label

        label_attributes = old_label.attributes.except(*attributes_to_exclude)
        begin
          UserLabel.create!(label_attributes.merge(user_id: new_user.id))
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.error "Failed to copy label for user #{old_user.id}: #{e.message}"
          raise
        end
      end

      def restore_collections(old_user, new_user, created_elements)
        old_collections = RecoveryDB::Models::Collection.where(user_id: old_user.id)
                                                        .where(is_shared: false)
                                                        .or(
                                                          RecoveryDB::Models::Collection.where(shared_by_id: @user_ids),
                                                        )
        return if old_collections.empty?

        id_map = {}
        sorted_collections = old_collections.sort_by { |col| col.ancestry.to_s.split('/').size }

        sorted_collections.each do |old_collection|
          if old_collection.label.in?(['All', 'chemotion-repository.net'])
            existing = Collection.find_by(user_id: new_user.id, label: old_collection.label)
            if existing
              id_map[old_collection.id] = existing
              restore_collection_elements(old_collection, existing, new_user.id, created_elements)
              next
            end
          end

          new_collection = build_new_collection(old_collection, new_user, id_map, created_elements)
          new_collection.save!

          restore_sync_collection_users(
            new_user: new_user,
            old_collection_id: old_collection.id,
            new_collection: new_collection,
          )

          id_map[old_collection.id] = new_collection
          restore_collection_elements(old_collection, new_collection, new_user.id, created_elements)
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.error "Failed to copy collection #{old_collection.id} for user #{old_user.id}: #{e.message}"
          raise
        end
      end

      def build_new_collection(old_collection, new_user, id_map, created_elements)
        attributes = old_collection.attributes.except(*attributes_to_exclude)
        new_collection = Collection.new(attributes.merge(user_id: new_user.id))

        if old_collection.inventory_id.present?
          new_inventory_id = restore_inventory(old_collection.inventory_id, created_elements)
          new_collection.inventory_id = new_inventory_id
        end

        return new_collection if old_collection.ancestry.blank?

        old_parent_id = old_collection.ancestry.split('/').last.to_i
        new_parent = id_map[old_parent_id]
        new_collection.parent = new_parent if new_parent
        new_collection
      end

      def restore_inventory(old_inventory_id, created_elements)
        inventory_key = ['Inventory', old_inventory_id]
        new_inventory_id = created_elements[inventory_key]
        unless new_inventory_id
          old_inventory = RecoveryDB::Models::Inventory.find(old_inventory_id)
          attributes = old_inventory.attributes.except(*attributes_to_exclude)
          new_inventory = Inventory.create!(attributes)
          new_inventory_id = new_inventory.id

          created_elements[inventory_key] = new_inventory_id
        end
        new_inventory_id
      rescue ActiveRecord::RecordInvalid => e
        Rails.logger.error("Failed to restore inventory #{old_inventory_id}: #{e.message}")
        raise
      end

      def restore_sync_collection_users(new_user:, old_user_id: nil, old_collection_id: nil, new_collection: nil)
        conditions = {}
        conditions[:user_id] = old_user_id if old_user_id
        conditions[:collection_id] = old_collection_id
        conditions[:shared_by_id] = @user_ids

        sync_collections = RecoveryDB::Models::SyncCollectionsUser.where(conditions)

        sync_collections.find_each do |sync_collection|
          attrs = sync_collection.attributes.except(*attributes_to_exclude)

          # Decide if collection should be assigned
          collection_id = if old_collection_id && sync_collection.collection_id == old_collection_id
                            new_collection&.id
                          end

          # Prevent duplicate insert
          existing = SyncCollectionsUser.find_by(
            user_id: new_user.id,
            collection_id: collection_id,
            shared_by_id: attrs['shared_by_id'],
          )
          next if existing

          record = SyncCollectionsUser.new(attrs)
          record.user = new_user
          record.collection = new_collection if collection_id
          record.save!(validate: false)
        end
      end

      def restore_collection_elements(old_collection, new_collection, new_user_id, created_elements)
        restore_collection_elements_by_type(Sample, old_collection, new_collection, new_user_id, created_elements)
        restore_collection_elements_by_type(Reaction, old_collection, new_collection, new_user_id, created_elements)
        restore_collection_elements_by_type(Wellplate, old_collection, new_collection, new_user_id, created_elements)
        restore_collection_elements_by_type(Screen, old_collection, new_collection, new_user_id, created_elements)
        restore_collection_elements_by_type(ResearchPlan, old_collection, new_collection, new_user_id, created_elements)
        restore_collection_elements_by_type(DeviceDescription, old_collection, new_collection, new_user_id,
                                            created_elements)
        restore_collection_elements_labimotion(old_collection, new_collection, new_user_id, created_elements)
      end

      def restore_collection_elements_by_type(main_model, old_collection, new_collection, new_user_id, created_elements)
        model_name = main_model.name
        join_model_name  = "Collections#{model_name}"
        foreign_key      = "#{model_name.underscore}_id"

        recovery_element_model = RecoveryDB::Models.const_get(model_name)
        recovery_join_model    = RecoveryDB::Models.const_get(join_model_name)
        join_model             = Object.const_get(join_model_name)

        join_records = recovery_join_model.where(collection_id: old_collection.id)

        join_records.each do |join_record|
          original_id = join_record.public_send(foreign_key)
          element_key = [main_model.name, original_id]
          new_element_id = created_elements[element_key]

          unless new_element_id
            new_element_id = restore_element(
              recovery_element_model, main_model, original_id, new_user_id, created_elements, new_collection
            )
            created_elements[element_key] = new_element_id if new_element_id
          end
          next unless new_element_id

          new_element = main_model.find(new_element_id)
          join_model.create!(
            collection: new_collection,
            model_name.underscore.to_sym => new_element,
          )
        end
      end

      def serialized_field(value)
        JSON.parse(value)
      rescue JSON::ParserError
        begin
          YAML.safe_load(
            value,
            permitted_classes: [ActiveSupport::HashWithIndifferentAccess, Hash, Array, Hashie::Mash],
            aliases: true,
          )
        rescue Psych::SyntaxError
          Rails.logger.warn("Failed to parse serialized field: #{e.message}")
          nil
        end
      end

      def process_text_columns_attributes(model, attributes)
        attributes = attributes.transform_keys(&:to_s)

        serialized_fields = model.attribute_types.select do |_, type|
          type.is_a?(ActiveRecord::Type::Serialized)
        end.keys

        serialized_fields.each do |field|
          value = attributes[field]
          next unless value.is_a?(String)

          parsed = serialized_field(value)
          attributes[field] = parsed if parsed.is_a?(Hash) || parsed.is_a?(Array)
        end

        attributes
      end

      # rubocop:disable Metrics/ParameterLists
      def restore_element(recovery_model, main_model, original_id, new_user_id, created_elements, new_collection)
        original = recovery_model.find_by(id: original_id)
        return nil unless original

        attributes = original.attributes.except(*attributes_to_exclude)
        attributes = process_text_columns_attributes(main_model, attributes)

        if main_model == Sample
          molecule_info = handle_molecule(original, new_user_id)
          attributes['molecule_id'] = molecule_info[:molecule_id]
          attributes['molecule_name_id'] = molecule_info[:molecule_name_id]
        end

        new_record = main_model.new(attributes)
        assign_creator_or_user(new_record, new_user_id)
        new_record.save(validate: false)
        restore_associations(main_model, original_id, new_record.id, new_user_id, created_elements, new_collection)
        new_record.id
      rescue StandardError => e
        Rails.logger.error "Failed to restore #{main_model.name} #{original_id}: #{e.message}"
        raise
      end
      # rubocop:enable Metrics/ParameterLists

      def handle_molecule(original_sample, new_user_id)
        result = { molecule_id: nil, molecule_name_id: nil }
        molfile = original_sample.molfile
        molecule = if molfile.present?
                     Molecule.find_or_create_by_molfile(molfile)
                   else
                     Molecule.find_or_create_dummy
                   end

        molecule ||= Molecule.find_or_create_dummy
        result[:molecule_id] = molecule.id

        if original_sample.molecule_name_id
          old_molecule_name = RecoveryDB::Models::MoleculeName.find(original_sample.molecule_name_id)

          molecule_name = MoleculeName.find_by(molecule_id: molecule.id, name: old_molecule_name.name)

          if molecule_name.present?
            result[:molecule_name_id] = molecule_name.id
          else
            mol_name_attrs = old_molecule_name.attributes.except(*attributes_to_exclude)
            mol_name_attrs['molecule_id'] = molecule.id
            mol_name_attrs['user_id'] = new_user_id

            new_molecule_name = MoleculeName.create!(mol_name_attrs)
            result[:molecule_name_id] = new_molecule_name.id
          end
        else
          Rails.logger.warn "Sample #{original_sample.id} has no molecule_name_id — skipping molecule_name restoration."
        end

        result
      rescue StandardError => e
        Rails.logger.error "Failed to handle molecule for Sample #{original_sample.id}: #{e.message}"
        raise
      end

      def assign_creator_or_user(record, new_user_id)
        if record.respond_to?(:creator=)
          record.creator = User.find(new_user_id)
        else
          record['user_id'] = new_user_id if record.has_attribute?('user_id')
          record['created_by'] = new_user_id if record.has_attribute?('created_by')
        end
      end

      def restore_associations(main_model, original_id, new_id, new_user_id, created_elements, new_collection)
        restore_container(main_model, original_id, new_id, new_user_id)
        restore_attachments(main_model, original_id, new_id, new_user_id)
        if main_model == Reaction
          restore_reactions_samples(original_id, new_id, created_elements, new_user_id,
                                    new_collection)
        end
        restore_wells(original_id, new_id) if main_model == Wellplate
        restore_links(new_id, created_elements) if main_model == ResearchPlan
      end

      def restore_container(element_type, old_element_id, new_element_id, new_user_id)
        old_base_id, id_map = restore_base_container(element_type, old_element_id, new_element_id)
        return unless old_base_id && id_map

        restore_descendants(old_base_id, id_map)
        restore_hierarchies(id_map)

        all_old_containers = RecoveryDB::Models::Container.where(id: id_map.keys, container_type: 'dataset')
        all_old_containers.each do |old_container|
          new_id = id_map[old_container.id]
          restore_attachments(Container, old_container.id, new_id, new_user_id)
        end
      end

      def restore_base_container(element_type, old_element_id, new_element_id)
        id_map = {}
        old_base = RecoveryDB::Models::Container.find_by!(
          containable_type: element_type.name,
          containable_id: old_element_id,
        )
        new_base = Container.find_by(containable: element_type.find(new_element_id))
        new_base ||= Container.create_root_container(containable: element_type.find(new_element_id))
        return unless new_base

        id_map[old_base.id] = new_base.id

        existing_children = new_base.children.to_a
        existing_children.each do |child|
          match = RecoveryDB::Models::Container.find_by(
            parent_id: old_base.id,
            container_type: child.container_type,
          )
          id_map[match.id] = child.id if match
        end

        [old_base.id, id_map]
      end

      def restore_descendants(old_base_id, id_map)
        descendants = RecoveryDB::Models::Container
                      .joins('INNER JOIN container_hierarchies ON containers.id = container_hierarchies.descendant_id')
                      .where(container_hierarchies: { ancestor_id: old_base_id })
                      .where.not(containers: { id: id_map.keys }) # Skip already cloned or pre-created
                      .order('container_hierarchies.generations ASC')

        descendants.in_batches(of: 500) do |batch|
          batch.each do |old_container|
            new_container = Container.new(old_container.attributes.except(*attributes_to_exclude))
            new_container.parent_id = id_map[old_container.parent_id]
            new_container.save!
            id_map[old_container.id] = new_container.id
          end
        end
      end

      def restore_hierarchies(id_map)
        old_hierarchies = RecoveryDB::Models::ContainerHierarchy.where(descendant_id: id_map.keys)
        old_hierarchies.each do |h|
          ContainerHierarchy.create_or_find_by!(ancestor_id: id_map[h.ancestor_id],
                                                descendant_id: id_map[h.descendant_id],
                                                generations: h.generations)
        end
      end

      def restore_attachments(element_type, old_element_id, new_element_id, new_user_id)
        attachments = RecoveryDB::Models::Attachment.where(
          attachable_type: element_type.name,
          attachable_id: old_element_id,
        )

        attachments.each do |attachment|
          attrs = attachment.attributes.with_indifferent_access.except(
            :id, :attachable_id, :created_by, :created_by_type, :log_data, :version
          )

          attrs[:attachable_id] = new_element_id
          attrs[:created_by] = new_user_id
          attrs[:created_by_type] = 'User'
          attrs[:version] = '/'

          changed = fix_conversion_derivative_in_attrs!(attrs)
          new_attachment = Attachment.create!(attrs)
          if changed
            attacher = new_attachment.attachment_attacher
            attacher.set(new_attachment.attachment)
            attacher.create_derivatives
            new_attachment.attachment_data = attacher.get
            new_attachment.save!
          end
        rescue StandardError => e
          Rails.logger.error "Failed to restore Attachment #{attachment.id}: #{e.message}"
          raise
        end
      end

      def fix_conversion_derivative_in_attrs!(attrs)
        return false unless attrs.dig('attachment_data', 'metadata', 'mime_type') == 'image/tiff'
        return false unless attrs.dig('attachment_data', 'derivatives', 'conversion', 'id')&.start_with?('/')

        attrs['attachment_data']['derivatives'].delete('conversion')
        true
      rescue StandardError => e
        Rails.logger.error("Failed to fix 'conversion' in attributes: #{e.message}")
        false
      end

      def restore_reactions_samples(original_reaction_id, new_reaction_id, created_elements, new_user_id,
                                    new_collection)
        created_samples = created_elements.each_with_object({}) do |((type, old_id), new_id), result|
          result[old_id] = new_id if type == 'Sample'
        end
        reactions_samples = RecoveryDB::Models::ReactionsSample.where(reaction_id: original_reaction_id)
        reactions_samples.each do |reaction_sample|
          attrs = reaction_sample.attributes.except(*attributes_to_exclude, 'reaction_id', 'sample_id')
          sample_key = ['Sample', reaction_sample.sample_id]
          unless created_elements.key?(sample_key)
            created_elements[sample_key] = restore_element(RecoveryDB::Models::Sample, Sample,
                                                           reaction_sample.sample_id, new_user_id,
                                                           created_elements, new_collection)
            new_sample = Sample.find(created_elements[sample_key])
            CollectionsSample.create!(
              collection: new_collection,
              sample: new_sample,
            )
          end

          new_sample_id = created_elements[sample_key]
          new_reaction_sample = ReactionsSample.new(attrs)
          new_reaction_sample.sample_id = new_sample_id
          new_reaction_sample.reaction_id = new_reaction_id
          new_reaction_sample.save!
        rescue StandardError => e
          Rails.logger.error "Failed to restore ReactionsSamples for reaction #{original_reaction_id}: #{e.message}"
          raise
        end
        reaction = Reaction.find(new_reaction_id)
        update_reaction_variations_sample_ids(reaction, created_samples)
      end

      def update_reaction_variations_sample_ids(reaction, created_samples)
        return unless reaction.variations.is_a?(Array)

        updated = transform_sample_ids_in_variation_array(reaction.variations, created_samples)

        reaction.variations = updated
        reaction.save! # triggers before_save, including transform_variations
      end

      def transform_sample_ids_in_variation_array(variation_array, created_samples)
        variation_array.map do |variation|
          variation.deep_dup.tap do |v|
            SAMPLE_SECTIONS.each do |section|
              next unless v[section].is_a?(Hash)

              v[section] = v[section].transform_keys do |sample_id_str|
                sample_id = sample_id_str.to_i
                new_sample_id = created_samples.fetch(sample_id) do
                  raise KeyError, "Sample ID #{sample_id} not found in created_samples during variation restoration"
                end

                new_sample_id.to_s
              end
            end
          end
        end
      end

      def restore_wells(original_wellplate_id, new_wellplate_id)
        wells = RecoveryDB::Models::Well.where(wellplate_id: original_wellplate_id)
        wells.each do |well|
          attrs = well.attributes.except(*attributes_to_exclude)
          attrs[:wellplate_id] = new_wellplate_id
          Well.create!(attrs)
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.error "Failed to restore Well #{well.id}: #{e.message}"
          raise
        end
      end

      def restore_links(id, created_elements)
        research_plan = ResearchPlan.find(id)
        rp_body = research_plan.body

        linkable_types = %w[sample reaction]

        updated_body = rp_body.filter_map do |b|
          if linkable_types.include?(b['type'])
            key_name = "#{b['type']}_id"
            old_id = b['value'][key_name]
            element_key = [b['type'].capitalize, old_id]

            new_id = created_elements[element_key]

            if new_id
              b['value'][key_name] = new_id
              b
            else
              Rails.logger.warn "Removed broken link block: #{element_key.inspect} not found"
              nil # exclude this block
            end
          else
            b # keep non-linkable blocks
          end
        end

        research_plan.update!(body: updated_body)
      end

      def restore_collection_elements_labimotion(old_collection, new_collection, _new_user_id, created_elements)
        col_elements = RecoveryDB::Models::CollectionsElement.where(collection_id: old_collection.id)
        col_elements.each do |col_elem|
          restore_collection_element_labimotion(col_elem, new_collection, created_elements)
        end
      end

      def restore_collection_element_labimotion(col_elem, new_collection, created_elements)
        old_element = RecoveryDB::Models::Element.find(col_elem.element_id)
        element_key = ['Element', old_element.id]
        return if created_elements.key?(element_key)

        attributes = old_element.attributes.except(*attributes_to_exclude)
        element_klass_key = ['ElementKlass', old_element.element_klass_id]
        attributes['element_klass_id'] = created_elements[element_klass_key]
        new_element = Labimotion::Element.new(attributes)
        assign_creator_or_user(new_element, new_collection.user_id)
        new_element.save!

        created_elements[element_key] = new_element.id
        new_element = Labimotion::CollectionsElement.create!(
          collection_id: new_collection.id,
          element_id: new_element.id,
          element_type: col_elem.element_type,
        )
        restore_segments(old_element, new_element, created_elements)
      rescue StandardError => e
        Rails.logger.error "Failed to restore labImotion element #{col_elem.element_id} " \
                           "for collection #{col_elem.collection_id}: #{e.message}"
        raise
      end

      def restore_segments(old_element, new_element, created_elements)
        old_segments = RecoveryDB::Models::Segment.where(element_id: old_element.id)
        old_segments.find_each do |old_segment|
          segment_key = ['Segment', old_segment.id]
          next if created_elements.key?(segment_key)

          attributes = old_segment.attributes.except(*attributes_to_exclude)
          attributes['element_id'] = new_element.id

          segment_klass_key = ['SegmentKlass', old_segment.segment_klass_id]
          attributes['segment_klass_id'] = created_elements[segment_klass_key]

          new_segment = Labimotion::Segment.create!(attributes)
          created_elements[segment_key] = new_segment.id
        rescue StandardError => e
          Rails.logger.error "Failed to restore segment #{old_segment.id} " \
                             "for element #{old_element.id}: #{e.message}"
          raise
        end
      end

      def restore_elements_elements(created_elements, old_user, new_user)
        element_ids = created_elements.keys
                                      .select { |k| k[0] == 'Element' }
                                      .map(&:last)

        old_relations = RecoveryDB::Models::ElementsElement.where(
          element_id: element_ids,
          created_by: old_user.id,
        )

        old_relations.each do |old_relation|
          new_element_id, new_parent_id = fetch_new_ids_or_nil(
            created_elements,
            ['Element', old_relation.element_id],
            ['Element', old_relation.parent_id],
          )

          if new_element_id && new_parent_id
            Labimotion::ElementsElement.find_or_create_by!(
              element_id: new_element_id,
              parent_id: new_parent_id,
            ) do |relation|
              relation.created_by = new_user.id
            end
          else
            Rails.logger.warn "Skipping elements relation with element_id #{old_relation.element_id} " \
                              "or parent_id #{old_relation.parent_id} because one is missing in map"
          end
        rescue StandardError => e
          Rails.logger.error 'Failed to restore elements_element relation ' \
                             "for element_id #{old_relation.element_id}: #{e.message}"
          raise
        end
      end

      def restore_elements_samples(created_elements, old_user, new_user)
        element_ids = created_elements.keys
                                      .select { |k| k[0] == 'Element' }
                                      .map(&:last)

        old_relations = RecoveryDB::Models::ElementsSample.where(
          element_id: element_ids,
          created_by: old_user.id,
        )

        old_relations.each do |old_relation|
          new_element_id, new_sample_id = fetch_new_ids_or_nil(
            created_elements,
            ['Element', old_relation.element_id],
            ['Sample', old_relation.sample_id],
          )

          if new_element_id && new_sample_id
            Labimotion::ElementsSample.find_or_create_by!(
              element_id: new_element_id,
              sample_id: new_sample_id,
            ) do |relation|
              relation.created_by = new_user.id
            end
          else
            Rails.logger.warn "Skipping elements_sample relation with element_id #{old_relation.element_id} " \
                              "or sample_id #{old_relation.sample_id} because one is missing in map"
          end
        rescue StandardError => e
          Rails.logger.error 'Failed to restore elements_sample relation ' \
                             "for element_id #{old_relation.element_id}: #{e.message}"
          raise
        end
      end

      def fetch_new_ids_or_nil(created_elements, *keys)
        new_ids = keys.map { |key| created_elements[key] }
        new_ids.size == keys.size ? new_ids : nil
      end

      def restore_devices(old_user, new_user)
        users_devices = RecoveryDB::Models::UsersDevice.where(user_id: old_user.id)
        device_ids = users_devices.pluck(:device_id)
        old_devices = RecoveryDB::Models::Device.where(id: device_ids).index_by(&:id)
        users_devices.each do |ud|
          old_device = old_devices[ud.device_id]
          attributes = old_device.attributes.except(*attributes_to_exclude)
          new_device = Device.create!(attributes)
          UsersDevice.create!(user_id: new_user.id, device_id: new_device.id)
        rescue StandardError => e
          Rails.logger.error "Failed to restore device #{old_device.id}: #{e.message}"
          raise
        end
      end

      def restore_sharing_and_synchronization(user_id_map)
        restore_sharing(user_id_map)
        restore_synchronization(user_id_map)
      end

      def restore_sharing(user_id_map)
        collections = Collection.where(is_shared: true).where(user_id: user_id_map.values)
        collections.find_each do |collection|
          new_user_id = user_id_map[collection.shared_by_id]

          if new_user_id
            collection.update!(shared_by_id: new_user_id)
          else
            collection.update!(shared_by_id: nil, is_shared: false)
          end
        end
      end

      def restore_synchronization(user_id_map)
        collections = Collection.synchronized
                                .where(user_id: user_id_map.values)
                                .includes(:sync_collections_users)

        collections.find_each do |collection|
          collection.sync_collections_users.each do |sync_user|
            new_user_id = user_id_map[sync_user.shared_by_id]

            if new_user_id
              sync_user.update!(shared_by_id: new_user_id)
            else
              sync_user.destroy
            end
          rescue ActiveRecord::RecordInvalid => e
            Rails.logger.error("Skipping sync_user #{sync_user.id}: #{e.message}")
          end

          collection.update!(is_synchronized: false) if collection.sync_collections_users.reload.empty?
        end
      end

      def restore_user_admin(user_id_map)
        RecoveryDB::Models::UsersAdmin.find_each do |ua|
          new_admin_id = user_id_map[ua.admin_id]
          new_user_id  = user_id_map[ua.user_id]

          next unless new_admin_id && new_user_id

          UsersAdmin.create!(admin_id: new_admin_id, user_id: new_user_id)
        end
      end

      def restore_user_group(user_id_map)
        RecoveryDB::Models::UsersGroup.find_each do |ua|
          new_group_id = user_id_map[ua.group_id]
          new_user_id  = user_id_map[ua.user_id]

          next unless new_group_id && new_user_id

          UsersGroup.create!(group_id: new_group_id, user_id: new_user_id)
        end
      end

      private

      def attributes_to_exclude
        %w[
          id created_at updated_at deleted_at user_id ancestry attachable_id molecule_id
          containable_id containable_type parent_id log_data identifier collection_id
          element_klass_id user_ids admin_ids segment_klass_id element_id inventory_id
        ]
      end

      def rec_users
        @rec_users ||= begin
          unless defined?(RecoveryDB::Models::User)
            raise NameError,
                  'RecoveryDB::Models::User is not defined.'
          end

          RecoveryDB::Models::User.where(id: @user_ids)
        end
      rescue NameError => e
        raise NameError, "Could not load RecoveryDB::Models::User: #{e.message}"
      end
    end
  end
end

# rubocop:enable Metrics/ClassLength, Metrics/AbcSize
