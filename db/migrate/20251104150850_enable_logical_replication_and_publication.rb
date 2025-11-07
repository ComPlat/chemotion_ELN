class EnableLogicalReplicationAndPublication < ActiveRecord::Migration[6.1]
  # Disable automatic transaction wrapping because replication slot creation
  # cannot be done in a transaction that has performed writes
  disable_ddl_transaction!

  def up
    # Enable logical replication at database level (requires superuser)
    # Note: This should ideally be set at PostgreSQL server startup
    # We're documenting it here for clarity

    # Create a publication for Change Data Capture
    # This tracks INSERT, UPDATE, DELETE operations on specified tables
    # Column-level filtering reduces replication overhead by excluding large binary fields
    # Use IF NOT EXISTS equivalent for idempotency
    unless publication_exists?('sequin_cdc_publication')
      execute <<-SQL
        CREATE PUBLICATION sequin_cdc_publication FOR TABLE
          containers (id, name, container_type, description, extended_metadata, created_at, updated_at, containable_id, containable_type, parent_id),
          samples (id, name, external_label, short_label, description, molfile_version, sample_type, created_at, updated_at, deleted_at, molecule_id, created_by, user_id),
          reactions (id, name, description, status, short_label, created_at, updated_at, deleted_at, created_by, rinchi_short_key, rxno)
        WITH (publish = 'insert,update,delete');
      SQL
    end

    # Create a replication slot for Sequin
    # This ensures we don't miss any changes even if Sequin is temporarily down
    # Check if slot exists first to make migration idempotent
    unless replication_slot_exists?('sequin_slot')
      execute <<-SQL
        SELECT pg_create_logical_replication_slot('sequin_slot', 'pgoutput');
      SQL
    end
  end

  private

  def publication_exists?(pub_name)
    result = execute("SELECT COUNT(*) as count FROM pg_publication WHERE pubname = '#{pub_name}';")
    result.first['count'].to_i > 0
  end

  def replication_slot_exists?(slot_name)
    result = execute("SELECT COUNT(*) as count FROM pg_replication_slots WHERE slot_name = '#{slot_name}';")
    result.first['count'].to_i > 0
  end

  def down
    # Drop the replication slot
    execute <<-SQL
      SELECT pg_drop_replication_slot('sequin_slot');
    SQL

    # Drop the publication
    execute <<-SQL
      DROP PUBLICATION IF EXISTS sequin_cdc_publication;
    SQL
  end
end
