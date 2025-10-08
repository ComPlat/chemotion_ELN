module RecoveryDB
  class Mount
    attr_reader :dump_path, :config, :logger

    MODEL_NAMES = %w[
      User Profile Collection Sample Reaction ReactionsSample Wellplate Well
      Screen ResearchPlan DeviceDescription Attachment MoleculeName
      Container ContainerHierarchy CollectionsSample
      CollectionsReaction CollectionsWellplate CollectionsScreen
      CollectionsResearchPlan CollectionsDeviceDescription Labimotion::ElementsSample
      SyncCollectionsUser UsersDevice Device Labimotion::CollectionsElement
      Labimotion::Element Labimotion::ElementKlass Labimotion::ElementsElement
      Labimotion::SegmentKlass Labimotion::Segment UserLabel UsersAdmin UsersGroup
    ].freeze

    MODEL_CLASSES = MODEL_NAMES.map(&:constantize)

    def initialize(file: nil, tables: [], database: nil, username: nil, password: nil, host: nil, port: nil)
      raise ArgumentError, 'Dump file not found' unless file.nil? || File.exist?(file)
      raise ArgumentError, 'Database name or db backup file required' if database.nil? && file.nil?

      @tables = tables
      @dump_path = file
      @logger = Logger.new(Rails.root.join('log/recovery_db.log'))

      set_config database: database || parse_db_name, username: username, password: password, host: host, port: port
    end

    def set_config(**args)
      rec_config = primary_config.configuration_hash.merge(database: args[:database])
      %i[username password host port].each do |key|
        rec_config[key] = args[key] if args[key].present?
      end
      @config = ActiveRecord::DatabaseConfigurations::HashConfig.new(ENV.fetch('RAILS_ENV', nil), 'recovery_db',
                                                                     rec_config)
      validate_config
    end

    # Check if the secondary database exists and create if necessary
    def database_exists?(conf = config)
      Models::DynamicRecord.connect_to(conf.configuration_hash)
      Models::DynamicRecord.connection
      true
    rescue ActiveRecord::NoDatabaseError
      false
    end

    def create_database(conf = config)
      if database_exists?(conf)
        log_event 'Secondary database already exists.'
      else
        log_event 'Secondary database does not exist. Creating...'
        ActiveRecord::Tasks::DatabaseTasks.create(conf.configuration_hash)
        log_event 'Secondary database created.'
      end
    ensure
      re_establish_connection
    end

    # Restore the backup using pg_restore
    # @todo: restore only the tables specified in the tables array
    def restore_backup(args: '')
      raise ArgumentError, 'Dump file not specified' if @dump_path.nil?

      create_database(config) unless database_exists?(config)
      config = @config.configuration_hash
      # Construct the pg_restore command
      args += " -d #{config[:database]} -U #{config[:username]} -h #{config[:host]} "
      args += " -p #{config[:port]} " if config[:port]

      command = if @dump_path.end_with?('.sql.gz')
                  "gunzip -c #{@dump_path} | psql  #{args} "
                elsif @dump_path.end_with?('.sql')
                  "psql  #{args} -f #{@dump_path}"
                else
                  "pg_restore  #{args} #{@dump_path}"
                end
      command = "PGPASSWORD=#{config[:password]} #{command}" if config[:password].present?

      log_event "Restoring backup using command: #{command}"
      system(command)
    end

    # Drop the database
    def destroy!
      log_event "Dropping database #{config.name} #{config.database}..."
      # Models::DynamicRecord.remove_connection(@config)
      ActiveRecord::Base.establish_connection(config)
      ActiveRecord::Base.clear_active_connections!
      ActiveRecord::Base.connection.execute <<~SQL.squish
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '#{config.database}' AND pid <> pg_backend_pid();
      SQL

      ActiveRecord::Tasks::DatabaseTasks.drop(config)
    ensure
      # Re-establish the connection to the primary database
      re_establish_connection
    end

    def re_establish_connection
      ActiveRecord::Base.establish_connection(primary_config)
    end

    def load_models(tables: @tables)
      # Load all models in the app/models directory
      tables = tables.map(&:to_s)
      MODEL_CLASSES.each do |model|
        log_event 'Found Element' if model == Labimotion::Element
        log_event 'Found ElementKlass' if model == Labimotion::ElementKlass
        next if model.name.start_with?('RecoveryDB::')
        next unless tables.empty? || tables.include?(model.table_name)

        log_event "Loading model: #{model.name} #{model.table_name}"
        # create the abstract class for the model as a subclass of DynamicRecord:
        recovery_model = Class.new(RecoveryDB::Models::DynamicRecord) do
          self.table_name = model.table_name
          self.primary_key = model.primary_key
          self.inheritance_column = :_type_disabled if model.columns_hash.key?('type')
        end
        RecoveryDB::Models.const_set(:"#{model.name.demodulize}", recovery_model)
        log_event "#{recovery_model.name} mounted"

        recovery_model.connect_to(config)
      end
      nil
    end

    def log_event(message)
      puts message
      logger.info message
    end

    private

    def primary_config
      # ActiveRecord::Base.connection_config
      @primary_config ||= ActiveRecord::Base.connection_db_config
    end

    def validate_config
      conf = @config.configuration_hash
      database = conf[:database]

      raise ArgumentError, 'Database name is required' if database.blank?
      raise ArgumentError, 'Invalid database name' unless /\A[a-zA-Z0-9_-]+\z/.match?(database)
      raise ArgumentError, 'Cannot use the primary database for recovery' if database == primary_config.database
      raise ArgumentError, 'Username is required' if conf[:username].blank?
      raise ArgumentError, 'Host is required' if conf[:host].blank?

      @config
    end

    def parse_db_name
      dump_filename = @dump_path.present? ? File.basename(@dump_path).split('.').first : nil
      dump_filename = dump_filename.present? && "rec_#{dump_filename}"
      dump_filename.presence || 'recovery_db'
    end
  end

  # Define a model for the chemicals table
  module Models
    class DynamicRecord < ApplicationRecord
      self.abstract_class = true
      # connects_to database: :secondary_db
      def self.connect_to(db_config = nil)
        establish_connection(db_config) if db_config
      end
    end
  end

  module Examples
    class RestoreChemicalsFromCollection
      attr_reader :collection_id, :collection_label, :file, :dry_run, :restore_args

      def initialize(collection_id: nil, collection_label: nil, file: nil, dry_run: true, date_lower: nil,
                     date_upper: nil, restore_args: nil)
        @collection_id = collection_id
        @collection_label = collection_label
        @file = file
        @dry_run = dry_run
        @restore_args = restore_args || ''
      end

      def mount
        @mount ||= RecoveryDB::Mount.new(file: @file, tables: %w[chemicals collections samples collections_samples])
      end

      def restore
        mount.restore_backup(args: restore_args)
      end

      def load
        mount.load_models
      end

      def run
        # raise ArgumentError, 'Collection ID and label is required' if @collection_id.nil? && @collection_label.nil?
        raise ArgumentError, 'Collection ID and label is required' if @collection_id.nil?
        raise ActiveRecord::RecordNotFound, 'Collection not found' if rec_collection.nil?

        @mount.log_event "Restoring chemicals from collection #{@collection_id} #{@collection_label} #{if dry_run
                                                                                                         '(DRY_RUN)'
                                                                                                       end}"
        @mount.log_event "Restoring soft deleted samples #{'(DRY_RUN)' if dry_run}"
        target_samples.each do |sample|
          sample.restore! unless dry_run
          @mount.log_event "Restored sample #{sample.id} #{sample.label}" unless dry_run
        end

        CollectionsSample.create_in_collection(target_samples.pluck(:id), target_collection_ids) unless dry_run
        puts "Restoring chemicals from collection #{@collection_id} #{@collection_label} #{'(DRY_RUN)' if dry_run}"
        rec_chemicals.each do |chemical|
          chemical_attributes = chemical.attributes
          Chemical.create(chemical_attributes) unless dry_run
        rescue ActiveRecord::RecordNotUnique => e
          puts "Record not unique: #{e.message}"
        rescue ActiveRecord::RecordInvalid => e
          puts "Record invalid: #{e.message}"
        end
      end

      def target_collection
        @target_collection ||= Collection.find_by(id: @collection_id) # , label: @collection_label)
      end

      def target_collection_ids
        @target_collection_ids ||= CollectionsSample.only_deleted.where(sample_id: target_samples.pluck(:id)).where(
          'deleted_at > ? and deleted_at < ?', @date_lower, @date_upper
        ).pluck(:id).uniq
      end

      def target_samples
        @target_collections_samples_ids ||= CollectionsSample.with_deleted.where(collection_id: target_collection.id).where(
          'deleted_at > ? and deleted_at < ?', @date_lower, @date_upper
        ).pluck(:sample_id)
        @target_samples ||= Sample.with_deleted.where(id: @target_collections_samples_ids).where(
          'deleted_at > ? and deleted_at < ?', @date_lower, @date_upper
        )
      end

      def rec_collection
        @rec_collection ||= RecoveryDB::Models::Collection.find_by(id: @collection_id) # , label: @collection_label)
      end

      def rec_samples
        @rec_collections_samples_ids ||= RecoveryDB::Models::CollectionsSample.where(collection_id: rec_collection.id).pluck(:sample_id)
        @rec_samples ||= RecoveryDB::Models::Sample.where(id: @rec_collections_samples_ids)
      end

      def rec_chemicals
        @rec_chemicals ||= RecoveryDB::Models::Chemical.where(sample_id: target_samples.pluck(:id))
      end
    end
  end
end
