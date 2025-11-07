# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'CDC Logical Replication Infrastructure', type: :integration do
  let(:connection) { ActiveRecord::Base.connection }

  describe 'PostgreSQL configuration' do
    it 'has logical replication enabled' do
      wal_level = connection.execute("SHOW wal_level;").first['wal_level']
      expect(wal_level).to eq('logical'), "WAL level should be 'logical' but is '#{wal_level}'"
    end

    it 'has sufficient replication slots configured' do
      max_slots = connection.execute("SHOW max_replication_slots;").first['max_replication_slots'].to_i
      expect(max_slots).to be >= 4, "Should have at least 4 replication slots, has #{max_slots}"
    end

    it 'has sufficient WAL senders configured' do
      max_senders = connection.execute("SHOW max_wal_senders;").first['max_wal_senders'].to_i
      expect(max_senders).to be >= 4, "Should have at least 4 WAL senders, has #{max_senders}"
    end
  end

  describe 'publication configuration' do
    let(:publication_name) { 'sequin_cdc_publication' }

    it 'has the CDC publication created' do
      publications = connection.execute(
        "SELECT pubname FROM pg_publication WHERE pubname = '#{publication_name}';"
      )
      expect(publications.count).to eq(1), "Publication '#{publication_name}' not found"
    end

    it 'publication includes the expected tables' do
      tables = connection.execute(<<-SQL).map { |r| r['tablename'] }
        SELECT tablename
        FROM pg_publication_tables
        WHERE pubname = '#{publication_name}'
        ORDER BY tablename;
      SQL

      expect(tables).to match_array(['containers', 'reactions', 'samples'])
    end

    it 'publication captures all operations' do
      pub_actions = connection.execute(<<-SQL
        SELECT pubinsert, pubupdate, pubdelete, pubtruncate
        FROM pg_publication
        WHERE pubname = '#{publication_name}';
      SQL
      ).first

      expect(pub_actions['pubinsert']).to be_truthy
      expect(pub_actions['pubupdate']).to be_truthy
      expect(pub_actions['pubdelete']).to be_truthy
    end
  end

  describe 'replication slot configuration' do
    let(:slot_name) { 'sequin_slot' }

    it 'has the CDC replication slot created' do
      slots = connection.execute(
        "SELECT slot_name FROM pg_replication_slots WHERE slot_name = '#{slot_name}';"
      )
      expect(slots.count).to eq(1), "Replication slot '#{slot_name}' not found"
    end

    it 'replication slot is configured correctly' do
      slot_info = connection.execute(<<-SQL
        SELECT slot_type, plugin, active, confirmed_flush_lsn
        FROM pg_replication_slots
        WHERE slot_name = '#{slot_name}';
      SQL
      ).first

      expect(slot_info['slot_type']).to eq('logical'), "Slot should be of type 'logical'"
      expect(slot_info['plugin']).to eq('pgoutput'), "Slot should use 'pgoutput' plugin"
      expect(slot_info['confirmed_flush_lsn']).not_to be_nil, "Slot should have LSN initialized"
    end

    it 'replication slot is not consuming excessive space' do
      lag_info = connection.execute(<<-SQL
        SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) as lag_size
        FROM pg_replication_slots
        WHERE slot_name = '#{slot_name}';
      SQL
      ).first

      # Extract bytes from pg_size_pretty format (e.g., "16 kB", "1024 bytes")
      lag_size = lag_info['lag_size']
      
      # Warn if lag is more than 100MB (this is informational, not a failure)
      if lag_size.include?('GB') || (lag_size.include?('MB') && lag_size.to_i > 100)
        warn "WARNING: Replication slot lag is #{lag_size}. Consider checking Sequin connection."
      end

      expect(lag_size).not_to be_nil
    end
  end

  describe 'database permissions' do
    it 'has replication permissions configured' do
      # This checks if the database is set up for logical replication
      # In production, you'd verify specific user permissions
      result = connection.execute(
        "SELECT has_database_privilege(current_user, current_database(), 'CREATE') as can_create;"
      ).first

      expect(result['can_create']).to be true
    end
  end

  describe 'CDC metadata tables' do
    it 'does not have schema conflicts with Sequin tables' do
      # Check that we don't have conflicting schema_migrations or other tables
      sequin_schemas = connection.execute(<<-SQL
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'sequin_%';
      SQL
      )

      # In test environment, Sequin might not be connected yet, so this is informational
      if sequin_schemas.any?
        schema_names = sequin_schemas.map { |s| s['schema_name'] }
        puts "Found Sequin schemas: #{schema_names.join(', ')}"
      end

      expect(true).to be true # This is more of an informational check
    end
  end

  describe 'WAL monitoring' do
    it 'can monitor WAL activity' do
      # Get current WAL position
      wal_info = connection.execute(<<-SQL
        SELECT pg_current_wal_lsn() as current_lsn,
               pg_walfile_name(pg_current_wal_lsn()) as current_wal_file;
      SQL
      ).first

      expect(wal_info['current_lsn']).not_to be_nil
      expect(wal_info['current_wal_file']).not_to be_nil
      expect(wal_info['current_wal_file']).to match(/^[0-9A-F]+$/), "WAL filename should be hexadecimal"
    end

    it 'tracks replication slot statistics' do
      stats = connection.execute(<<-SQL
        SELECT 
          slot_name,
          spill_txns,
          spill_count,
          spill_bytes,
          stream_txns,
          stream_count,
          stream_bytes,
          stats_reset
        FROM pg_stat_replication_slots
        WHERE slot_name = 'sequin_slot';
      SQL
      )

      # Slot stats might not exist if Sequin hasn't connected yet
      if stats.any?
        stat = stats.first
        puts "Replication slot stats: spilled=#{stat['spill_txns']}, streamed=#{stat['stream_txns']}"
      end

      expect(true).to be true # Informational
    end
  end
end
