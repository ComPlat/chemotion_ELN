# frozen_string_literal: true

module RecoveryDB
  module PartialMigration
    class RestoreUsers
      attr_reader :user_ids, :file

      def initialize(user_ids: nil, file: nil)
        @user_ids = user_ids
        @file = file
      end

      def mount
        @mount ||= RecoveryDB::Mount.new(file: @file, tables: %w[users profiles collections])
      end

      def run
        raise ArgumentError, 'User Ids are required' if @user_ids.nil?
        raise ActiveRecord::RecordNotFound, 'No user found' if rec_users.empty?

        @mount.log_event "Restoring users: found #{rec_users.size} of #{@user_ids.size} user(s) to restore"
        rec_users.each do |recovery_user|
          restore_user(recovery_user)
        end
      end

      def restore_user(old_user)
        user_attributes = recovery_user.attributes.except(*attributes_to_exclude & recovery_user.attributes.keys)
        begin
          new_user = User.create!(user_attributes)
          restore_profile(old_user, new_user)
          restore_collections(old_user, new_user)
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.error "Failed to copy user #{recovery_user.id}: #{e.message}"
        end
      end

      def restore_profile(old_user, new_user)
        old_profile = RecoveryDB::Models::Profile.find_by(user_id: old_user.id)
        return unless old_profile

        profile_attributes = old_profile.attributes.except(*attributes_to_exclude & old_profile.attributes.keys)
        begin
          Profile.create!(profile_attributes.merge(user_id: new_user.id))
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.error "Failed to copy profile for user #{old_user.id}: #{e.message}"
        end
      end

      def restore_collections(old_user, new_user)
        old_collections = RecoveryDB::Models::Collection.where(user_id: old_user.id)
        return if old_collections.empty?

        old_collections.each do |old_collection|
          collection_attributes = old_collection.attributes.except(
            *attributes_to_exclude & old_collection.attributes.keys,
          )
          begin
            new_collection = Collection.create!(collection_attributes.merge(user_id: new_user.id))
            restore_collection_elements(old_collections, new_collection, new_user.id)
          rescue ActiveRecord::RecordInvalid => e
            Rails.logger.error "Failed to copy collection #{old_collection.id} for user #{old_user.id}: #{e.message}"
          end
        end
      end

      def restore_collection_elements(old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(Sample, old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(Reaction, old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(Wellplate, old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(Screen, old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(ResearchPlan, old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(DeviceDescription, old_collection, new_collection, new_user_id)
      end

      def restore_collection_element_by_type(main_model, old_collection, new_collection, new_user_id)
        model_name       = main_model.name
        join_model_name  = "Collections#{model_name}"
        foreign_key      = "#{model_name.underscore}_id"

        # Source models from RecoveryDB
        recovery_element_model = RecoveryDB::Models.const_get(model_name)
        recovery_join_model    = RecoveryDB::Models.const_get(join_model_name)

        # Target join model (in main app)
        join_model = Object.const_get(join_model_name)

        created_elements = {}

        join_records = recovery_join_model.where(collection_id: old_collection.id)

        join_records.each do |join_record|
          original_id = join_record.public_send(foreign_key)

          new_element = created_elements[original_id] || restore_element(
            recovery_element_model, main_model, original_id, new_user_id
          )

          next unless new_element

          created_elements[original_id] = new_element
          join_model.create!(collection: new_collection, model_name.underscore.to_sym => new_element)
        end
      end

      def restore_element(recovery_model, main_model, original_id, new_user_id)
        original = recovery_model.find_by(id: original_id)
        return nil unless original

        attrs = original.attributes.except(
          *attributes_to_exclude & original.attributes.keys,
        )

        main_model.create!(attrs.merge(user_id: new_user_id))
      rescue ActiveRecord::RecordInvalid => e
        Rails.logger.error "Failed to restore #{main_model.name} #{original_id}: #{e.message}"
        nil
      end

      def attributes_to_exclude
        %w[id created_at updated_at deleted_at user_id]
      end

      def rec_users
        @rec_users ||= RecoveryDB::Models::User.where(id: @user_ids)
      end
    end
  end
end
