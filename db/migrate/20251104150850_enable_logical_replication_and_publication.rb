class EnableLogicalReplicationAndPublication < ActiveRecord::Migration[6.1]
  # Disable automatic transaction wrapping because replication slot creation
  # cannot be done in a transaction that has performed writes
  disable_ddl_transaction!

  def up
    # Enable logical replication at database level (requires superuser)
    # Note: This should ideally be set at PostgreSQL server startup
    # We're documenting it here for clarity

    # Set replica identity to FULL for tables with column-level publications
    # This allows logical replication to work with column lists by including
    # the old values of all columns (not just the primary key) in the WAL.
    # FULL identity is needed when the publication's column list doesn't include
    # all columns that would be part of the default replica identity.
    execute "ALTER TABLE containers REPLICA IDENTITY FULL;"
    execute "ALTER TABLE samples REPLICA IDENTITY FULL;"
    execute "ALTER TABLE reactions REPLICA IDENTITY FULL;"

    # Create a publication for Change Data Capture
    # This tracks INSERT, UPDATE, DELETE operations on specified tables
    # Note: When using REPLICA IDENTITY FULL with column lists, ALL columns must be included
    # Column filtering should be done on the Sequin consumer side instead
    # Use IF NOT EXISTS equivalent for idempotency
    unless publication_exists?('sequin_cdc_publication')
      execute <<-SQL
        CREATE PUBLICATION sequin_cdc_publication FOR TABLE
          containers,
          samples,
          reactions
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

    # Restore default replica identity (using primary key)
    execute "ALTER TABLE containers REPLICA IDENTITY DEFAULT;"
    execute "ALTER TABLE samples REPLICA IDENTITY DEFAULT;"
    execute "ALTER TABLE reactions REPLICA IDENTITY DEFAULT;"
  end
end
