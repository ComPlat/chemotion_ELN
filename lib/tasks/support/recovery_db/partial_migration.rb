# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength

module RecoveryDB
  module PartialMigration
    class RestoreUsers
      attr_reader :user_ids, :file

      def initialize(user_ids: nil, file: nil)
        @user_ids = user_ids
        @file = file
        mount.restore_backup
        mount.load_models
      end

      def mount
        @mount ||= RecoveryDB::Mount.new(file: @file,
                                         tables: %w[users profiles collections samples reactions wellplates wells
                                                    screens research_plans device_descriptions attachments
                                                    containers container_hierarchies collections_samples
                                                    collections_reactions collections_wellplates collections_screens
                                                    collections_research_plans collections_device_descriptions
                                                    sync_collections_users users_devices devices collections_elements
                                                    elements element_klasses elements_elements elements_samples
                                                    segment_klasses segments])
      end

      def run
        raise ArgumentError, 'User Ids are required' if @user_ids.nil?
        raise ActiveRecord::RecordNotFound, 'No user found' if rec_users.empty?

        user_id_map = {}
        created_elements = {}

        @mount.log_event "Restoring users: found #{rec_users.size} of #{@user_ids.size} user(s) to restore"
        restore_element_klasses(created_elements)
        rec_users.each do |recovery_user|
          new_user = restore_user(recovery_user, created_elements)
          user_id_map[recovery_user.id] = new_user.id
        end
        restore_sharing_and_synchronization(user_id_map)
        @mount.destroy!
      end

      def restore_element_klasses(created_elements)
        element_klass_ids = RecoveryDB::Models::Element
                            .joins(collections_elements: { collection: :user })
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
          new_user.save(validate: false)
          restore_profile(old_user, new_user)
          restore_collections(old_user, new_user, created_elements)
          restore_sync_collection_users(
            old_user_id: old_user.id,
            new_user_id: new_user.id,
          )
          restore_elements_elements(created_elements, old_user, new_user)
          restore_elements_samples(created_elements, old_user, new_user)
          restore_devices(old_user, new_user)
          new_user
        rescue ActiveRecord::ActiveRecordError => e
          Rails.logger.error "Failed to copy user #{old_user.id}: #{e.message}"
          nil
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
        end
      end

      def restore_collections(old_user, new_user, created_elements)
        old_collections = RecoveryDB::Models::Collection.where(user_id: old_user.id)
                                                        .where(is_shared: false)
                                                        .or(RecoveryDB::Models::Collection.where(shared_by_id: @user_ids))
        return if old_collections.empty?

        id_map = {}
        sorted_collections = old_collections.sort_by { |col| col.ancestry.to_s.split('/').size }

        sorted_collections.each do |old_collection|
          new_collection = build_new_collection(old_collection, new_user, id_map)
          new_collection.save!

          id_map[old_collection.id] = new_collection
          restore_collection_elements(old_collection, new_collection, new_user.id, created_elements)
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.error "Failed to copy collection #{old_collection.id} for user #{old_user.id}: #{e.message}"
        end
      end

      def build_new_collection(old_collection, new_user, id_map)
        attributes = old_collection.attributes.except(*attributes_to_exclude)
        new_collection = Collection.new(attributes.merge(user_id: new_user.id))
        restore_sync_collection_users(
          new_user_id: new_user.id,
          old_collection_id: old_collection.id,
          new_collection_id: new_collection.id,
        )

        return new_collection if old_collection.ancestry.blank?

        old_parent_id = old_collection.ancestry.split('/').last.to_i
        new_parent = id_map[old_parent_id]
        new_collection.parent = new_parent if new_parent
        new_collection
      end

      def restore_sync_collection_users(new_user_id, old_user_id: nil, old_collection_id: nil, new_collection_id: nil)
        # Build query conditions
        conditions = {}
        conditions[:user_id] = old_user_id if old_user_id
        conditions[:collection_id] = old_collection_id if old_collection_id
        conditions[:shared_by_id] = @user_ids

        sync_collections = RecoveryDB::Models::SyncCollectionsUser.where(conditions)

        sync_collections.find_each do |sync_collection|
          attrs = sync_collection.attributes.except(*attributes_to_exclude)

          attrs['user_id'] = new_user_id
          # Replace collection_id only if it matches the provided old_collection_id
          if old_collection_id && sync_collection.collection_id == old_collection_id
            attrs['collection_id'] = new_collection_id
          end

          # Leave shared_by_id (sharer) as-is — will fix later
          SyncCollectionsUser.create!(attrs)
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

          unless created_elements.key?(element_key)
            created_elements[element_key] = restore_element(
              recovery_element_model, main_model, original_id, new_user_id, created_elements
            )
          end
          new_element = created_elements[element_key]
          next unless new_element

          join_model.create!(
            collection: new_collection,
            model_name.underscore.to_sym => new_element,
          )
        end
      end

      def restore_element(recovery_model, main_model, original_id, new_user_id, created_elements)
        original = recovery_model.find_by(id: original_id)
        return nil unless original

        attributes = original.attributes.except(*attributes_to_exclude)
        new_record = main_model.new(attributes)
        assign_creator_or_user(new_record, new_user_id)
        new_record.save(validate: false)
        restore_associations(main_model, original_id, new_record.id, new_user_id, created_elements)
        new_record
      rescue ActiveRecord::RecordInvalid => e
        Rails.logger.error "Failed to restore #{main_model.name} #{original_id}: #{e.message}"
        nil
      end

      def assign_creator_or_user(record, new_user_id)
        if record.respond_to?(:creator=)
          record.creator = User.find(new_user_id)
        else
          record['user_id'] = new_user_id if record.has_attribute?('user_id')
          record['created_by'] = new_user_id if record.has_attribute?('created_by')
        end
      end

      def restore_associations(main_model, original_id, new_id, new_user_id, created_elements)
        restore_container(main_model, original_id, new_id, new_user_id)
        restore_attachments(main_model, original_id, new_id, new_user_id)
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
        attachments = RecoveryDB::Models::Attachment.where(attachable_type: element_type.name,
                                                           attachable_id: old_element_id)
        attachments.each do |attachment|
          attrs = attachment.attributes.except(%w[id attachable_id created_by created_by_type log_data])
          attrs[:attachable_id] = new_element_id
          attrs[:created_by] = new_user_id
          attrs[:created_by_type] = 'User'
          Attachment.create!(attrs)
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.error "Failed to restore Attachment #{attachment.id}: #{e.message}"
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
        end
      end

      def restore_links(id, created_elements)
        research_plan = ResearchPlan.find(id)
        rp_body = research_plan.body

        linkable_types = %w[sample reaction]

        rp_body.each do |b|
          next unless linkable_types.include?(b['type'])

          key_name = "#{b['type']}_id"
          old_id = b['value'][key_name]
          element_key = [b['type'].capitalize, old_id]

          new_id = created_elements[element_key]
          raise "Missing mapping for #{element_key.inspect}" unless new_id

          b['value'][key_name] = new_id
        end

        research_plan.update!(body: rp_body)
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
        new_element = Labimotion::Element.create!(attributes)

        created_elements[element_key] = new_element.id
        new_element = Labimotion::CollectionsElement.create!(
          collection_id: new_collection.id,
          element_id: new_element.id,
          element_type: col_elem.element_type,
        )
        restore_segments(old_element, new_element, created_elements)
      rescue StandardError => e
        Rails.logger.error "Failed to restore element #{col_elem.element_id} " \
                           "for collection #{col_elem.collection_id}: #{e.message}"
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
        collections = Collection.synchronized.where(user_id: user_id_map.values).includes(:sync_collections_users)
        collections.find_each do |collection|
          collection.sync_collections_users.each do |sync_user|
            new_user_id = user_id_map[sync_user.shared_by_id]

            if new_user_id
              sync_user.update!(shared_by_id: new_user_id)
            else
              sync_user.destroy
            end
          end

          collection.update!(is_synchronized: false) if collection.sync_collections_users.reload.empty?
        end
      end

      private

      def attributes_to_exclude
        %w[
          id created_at updated_at deleted_at user_id ancestry attachable_id
          containable_id containable_type parent_id log_data identifier
          element_klass_id user_ids admin_ids segment_klass_id element_id
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

# rubocop:enable Metrics/ClassLength
