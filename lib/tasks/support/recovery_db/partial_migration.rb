# frozen_string_literal: true

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
                                                    screens research_plans device_descriptions])
      end

      def run
        raise ArgumentError, 'User Ids are required' if @user_ids.nil?
        raise ActiveRecord::RecordNotFound, 'No user found' if rec_users.empty?

        @mount.log_event "Restoring users: found #{rec_users.size} of #{@user_ids.size} user(s) to restore"
        rec_users.each do |recovery_user|
          restore_user(recovery_user)
        end
        @mount.destroy!
      end

      def restore_user(old_user)
        user_attributes = old_user.attributes.except(*attributes_to_exclude)

        begin
          abbreviation_log_path = Rails.root.join('log/name_abbreviation_changes.log')
          if User.find_by(name_abbreviation: user_attributes['name_abbreviation'])
            old_abbreviation = user_attributes['name_abbreviation']
            new_abbreviation = create_unique_name_abbreviation(user_attributes)
            user_attributes['name_abbreviation'] = new_abbreviation
            # Log the change to a dedicated file
            File.open(abbreviation_log_path, 'a') do |file|
              file.puts "#{user_attributes['email']}: #{old_abbreviation} => #{new_abbreviation}"
            end
          end
          new_user = User.new(user_attributes)
          # Skip validations (e.g. password) when restoring
          new_user.save(validate: false)

          restore_profile(old_user, new_user)
          restore_collections(old_user, new_user)
        rescue ActiveRecord::ActiveRecordError => e
          Rails.logger.error "Failed to copy user #{old_user.id}: #{e.message}"
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

      def restore_collections(old_user, new_user)
        old_collections = RecoveryDB::Models::Collection.where(user_id: old_user.id)
        return if old_collections.empty?

        id_map = {}
        sorted_collections = old_collections.sort_by { |col| col.ancestry.to_s.split('/').size }

        sorted_collections.each do |old_collection|
          new_collection = build_new_collection(old_collection, new_user, id_map)
          new_collection.save!

          id_map[old_collection.id] = new_collection
          restore_collection_elements(old_collection, new_collection, new_user.id)
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.error "Failed to copy collection #{old_collection.id} for user #{old_user.id}: #{e.message}"
        end
      end

      def build_new_collection(old_collection, new_user, id_map)
        attributes = old_collection.attributes.except(*attributes_to_exclude)
        new_collection = Collection.new(attributes.merge(user_id: new_user.id))
        return new_collection if old_collection.ancestry.blank?

        old_parent_id = old_collection.ancestry.split('/').last.to_i
        new_parent = id_map[old_parent_id]
        new_collection.parent = new_parent if new_parent
        new_collection
      end

      def restore_collection_elements(old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(Sample, old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(Reaction, old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(Wellplate, old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(Screen, old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(ResearchPlan, old_collection, new_collection, new_user_id)
        restore_collection_elements_by_type(DeviceDescription, old_collection, new_collection, new_user_id)
      end

      def restore_collection_elements_by_type(main_model, old_collection, new_collection, new_user_id)
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

        attributes = original.attributes.except(*attributes_to_exclude)

        attributes['user_id'] = new_user_id if main_model.column_names.include?('user_id')
        attributes['created_by'] = new_user_id if main_model.column_names.include?('created_by')
        attributes['short_label'] = nil

        new_record = main_model.new(attributes)
        new_record.creator = User.find(new_user_id) if new_record.respond_to?(:creator=)
        new_record.save(validate: false)
        restore_wells(original_id, new_record.id) if main_model == Wellplate
        new_record
      rescue ActiveRecord::RecordInvalid => e
        Rails.logger.error "Failed to restore #{main_model.name} #{original_id}: #{e.message}"
        nil
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

      def attributes_to_exclude
        %w[id created_at updated_at deleted_at user_id ancestry]
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
