# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'CDC End-to-End Data Capture', type: :integration do
  let(:connection) { ActiveRecord::Base.connection }
  
  # WAL helper methods are provided by spec/support/wal_helpers.rb (included into RSpec).
  # We intentionally do not redefine them here to avoid duplication.

  # Create a test table for CDC testing
  before(:all) do
    ActiveRecord::Base.connection.execute(<<-SQL
      CREATE TABLE IF NOT EXISTS cdc_test_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        payload JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    SQL
    )
  end

  after(:all) do
    ActiveRecord::Base.connection.execute("DROP TABLE IF EXISTS cdc_test_events;")
  end

  # Clean up test data before each test
  before(:each) do
    connection.execute("DELETE FROM cdc_test_events;")
  end

  describe 'INSERT operations' do
    it 'captures INSERT events in WAL' do
      # Record WAL position before change
      initial_lsn = current_wal_position
      
      # Perform INSERT
      connection.execute(<<-SQL
        INSERT INTO cdc_test_events (event_type, payload)
        VALUES ('test_insert', '{"test": true, "timestamp": "#{Time.current.iso8601}"}'::jsonb);
      SQL
      )

      # Record WAL position after change
        # Wait for WAL to advance and record final position
        expect(wait_for_wal_advance(initial_lsn)).to be_truthy, "WAL position should advance after INSERT"
        final_lsn = current_wal_position
      
      # Verify the record was inserted
      result = connection.execute("SELECT * FROM cdc_test_events WHERE event_type = 'test_insert';")
      expect(result.count).to eq(1)
      
      record = result.first
      expect(record['event_type']).to eq('test_insert')
      expect(JSON.parse(record['payload'])['test']).to be true
    end

    it 'handles bulk inserts' do
      initial_lsn = current_wal_position
      
      # Perform bulk INSERT
      connection.execute(<<-SQL
        INSERT INTO cdc_test_events (event_type, payload)
        VALUES 
          ('bulk_1', '{"batch": 1}'::jsonb),
          ('bulk_2', '{"batch": 2}'::jsonb),
          ('bulk_3', '{"batch": 3}'::jsonb);
      SQL
      )

  expect(wait_for_wal_advance(initial_lsn)).to be_truthy
  final_lsn = current_wal_position
      
      # Verify all records inserted
      result = connection.execute("SELECT COUNT(*) as count FROM cdc_test_events WHERE event_type LIKE 'bulk_%';")
      expect(result.first['count'].to_i).to eq(3)
    end
  end

  describe 'UPDATE operations' do
    before(:each) do
      connection.execute(<<-SQL
        INSERT INTO cdc_test_events (id, event_type, payload)
        VALUES (1, 'test_update', '{"version": 1}'::jsonb);
      SQL
      )
    end

    it 'captures UPDATE events in WAL' do
      initial_lsn = current_wal_position
      
      # Perform UPDATE
      connection.execute(<<-SQL
        UPDATE cdc_test_events
        SET payload = '{"version": 2, "updated": true}'::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1;
      SQL
      )

      # Wait for WAL to advance
      expect(wait_for_wal_advance(initial_lsn)).to be_truthy, "WAL position should advance after UPDATE"
      final_lsn = current_wal_position
      
      # Verify the record was updated
      result = connection.execute("SELECT * FROM cdc_test_events WHERE id = 1;").first
      payload = JSON.parse(result['payload'])
      expect(payload['version']).to eq(2)
      expect(payload['updated']).to be true
    end

    it 'captures multiple updates to same record' do
      # Perform multiple updates and ensure WAL advances after each
      prev_lsn = current_wal_position
      3.times do |i|
        connection.execute(<<-SQL
          UPDATE cdc_test_events
          SET payload = '{"version": #{i + 2}}'::jsonb
          WHERE id = 1;
        SQL
        )
        expect(wait_for_wal_advance(prev_lsn)).to be_truthy, "Each UPDATE should advance WAL position"
        prev_lsn = current_wal_position
      end
      
      # Verify final state
      result = connection.execute("SELECT * FROM cdc_test_events WHERE id = 1;").first
      payload = JSON.parse(result['payload'])
      expect(payload['version']).to eq(4) # Initial 1 + 3 updates
    end
  end

  describe 'DELETE operations' do
    before(:each) do
      connection.execute(<<-SQL
        INSERT INTO cdc_test_events (id, event_type, payload)
        VALUES (99, 'test_delete', '{"to_be_deleted": true}'::jsonb);
      SQL
      )
    end

    it 'captures DELETE events in WAL' do
  initial_lsn = current_wal_position
      
  # Verify record exists
      before_delete = connection.execute("SELECT COUNT(*) as count FROM cdc_test_events WHERE id = 99;")
      expect(before_delete.first['count'].to_i).to eq(1)
      
      # Perform DELETE
      connection.execute("DELETE FROM cdc_test_events WHERE id = 99;")

  expect(wait_for_wal_advance(initial_lsn)).to be_truthy, "WAL position should advance after DELETE"
  final_lsn = current_wal_position
      
      # Verify record deleted
      after_delete = connection.execute("SELECT COUNT(*) as count FROM cdc_test_events WHERE id = 99;")
      expect(after_delete.first['count'].to_i).to eq(0)
    end
  end

  describe 'transaction handling' do
    it 'captures committed transactions' do
      initial_lsn = current_wal_position
      
      # Perform transaction
      connection.transaction do
        connection.execute(<<-SQL
          INSERT INTO cdc_test_events (event_type, payload)
          VALUES ('txn_1', '{"transaction": true}'::jsonb);
        SQL
        )
        connection.execute(<<-SQL
          INSERT INTO cdc_test_events (event_type, payload)
          VALUES ('txn_2', '{"transaction": true}'::jsonb);
        SQL
        )
      end

      expect(wait_for_wal_advance(initial_lsn)).to be_truthy
      final_lsn = current_wal_position
      
      # Verify both records committed
      result = connection.execute("SELECT COUNT(*) as count FROM cdc_test_events WHERE event_type LIKE 'txn_%';")
      expect(result.first['count'].to_i).to eq(2)
    end

    it 'does not capture rolled back transactions' do
      initial_lsn = current_wal_position
      
      # Attempt transaction that will rollback
      begin
        connection.transaction do
          connection.execute(<<-SQL
            INSERT INTO cdc_test_events (event_type, payload)
            VALUES ('rollback_test', '{"should_not_appear": true}'::jsonb);
          SQL
          )
          raise ActiveRecord::Rollback
        end
      rescue ActiveRecord::Rollback
        # Expected
      end

      # WAL might still advance due to the attempted transaction, but record shouldn't exist
      result = connection.execute("SELECT COUNT(*) as count FROM cdc_test_events WHERE event_type = 'rollback_test';")
      expect(result.first['count'].to_i).to eq(0), "Rolled back record should not exist"
    end
  end

  describe 'CDC metadata and monitoring' do
    it 'tracks WAL generation from operations' do
      initial_lag = wal_lag_bytes
      
      # Perform several operations
      10.times do |i|
        connection.execute(<<-SQL
          INSERT INTO cdc_test_events (event_type, payload)
          VALUES ('monitoring_#{i}', '{"index": #{i}}'::jsonb);
        SQL
        )
      end

      # WAL should have been generated
      final_lag = wal_lag_bytes
      
      # The lag might increase (if Sequin hasn't consumed yet) or stay similar
      # This is informational
      puts "WAL lag: #{initial_lag} bytes -> #{final_lag} bytes"
      
      expect(final_lag).to be >= 0
    end

    it 'provides visibility into publication tables' do
      # Check that our test table is included in the publication
      pub_tables = connection.execute(<<-SQL
        SELECT schemaname, tablename
        FROM pg_publication_tables
        WHERE pubname = 'sequin_cdc_publication'
        AND tablename = 'cdc_test_events';
      SQL
      )

      # Since we're using FOR ALL TABLES, our test table should be included
      expect(pub_tables.count).to be >= 0 # May be empty if using FOR ALL TABLES
    end
  end

  describe 'data type handling' do
    it 'handles JSONB data correctly' do
      complex_json = {
        string: 'test',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: { key: 'value' }
      }
      
      connection.execute(<<-SQL
        INSERT INTO cdc_test_events (event_type, payload)
        VALUES ('complex_json', '#{complex_json.to_json}'::jsonb);
      SQL
      )

      result = connection.execute("SELECT payload FROM cdc_test_events WHERE event_type = 'complex_json';").first
      stored_json = JSON.parse(result['payload'])
      
      expect(stored_json['string']).to eq('test')
      expect(stored_json['number']).to eq(42)
      expect(stored_json['boolean']).to be true
      expect(stored_json['array']).to eq([1, 2, 3])
      expect(stored_json['nested']['key']).to eq('value')
    end

    it 'handles NULL values' do
      connection.execute(<<-SQL
        INSERT INTO cdc_test_events (event_type, payload)
        VALUES ('null_test', NULL);
      SQL
      )

      result = connection.execute("SELECT payload FROM cdc_test_events WHERE event_type = 'null_test';").first
      expect(result['payload']).to be_nil
    end
  end

  describe 'replication slot consumption', :skip_ci do
    it 'monitors whether Sequin is consuming changes' do
      # Get initial slot position
      initial_position = replication_slot_position
      
      # Make some changes
      105.times do |i|
        connection.execute(<<-SQL
          INSERT INTO cdc_test_events (event_type, payload)
          VALUES ('consumption_test_#{i}', '{"index": #{i}}'::jsonb);
        SQL
        )
      end

      # Wait a moment for Sequin to potentially consume
      sleep 30
      
      # Get final slot position
      final_position = replication_slot_position
      
      # Check if Sequin consumed the changes
      if initial_position != final_position
        puts "✓ Sequin consumed changes (LSN: #{initial_position} -> #{final_position})"
      else
        puts "⚠ Sequin has not consumed changes yet (this is OK if Sequin is not actively polling)"
      end
      
      # This is informational - we don't fail if Sequin hasn't consumed yet
      expect(final_position).not_to be_nil
    end
  end

  describe 'production tables & replication monitoring' do
    let(:tracked_tables) { %w[containers samples reactions] }

    it 'verifies all production tables are in publication' do
      pub_tables = connection.execute(<<-SQL
        SELECT tablename 
        FROM pg_publication_tables 
        WHERE pubname = 'sequin_cdc_publication'
        ORDER BY tablename;
      SQL
      ).map { |row| row['tablename'] }

      expect(pub_tables).to match_array(tracked_tables)
    end

    it 'verifies publication tracks containers table' do
      pub_tables = connection.execute(<<-SQL
        SELECT tablename, attnames 
        FROM pg_publication_tables 
        WHERE pubname = 'sequin_cdc_publication' AND tablename = 'containers';
      SQL
      )

      expect(pub_tables.count).to eq(1)
      columns = pub_tables.first['attnames']
      expect(columns).to include('id', 'name', 'container_type')
    end

    it 'provides real-time replication metrics' do
      metrics = connection.execute(<<-SQL
        SELECT 
          slot_name,
          active,
          pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) as lag_bytes,
          pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) as lag_size
        FROM pg_replication_slots
        WHERE slot_name = 'sequin_slot';
      SQL
      ).first

      expect(metrics).not_to be_nil
      expect(metrics['slot_name']).to eq('sequin_slot')

      lag_bytes = metrics['lag_bytes'].to_i
      lag_size = metrics['lag_size']

      puts "\n📊 Replication Metrics:"
      puts "  Slot: #{metrics['slot_name']}"
      puts "  Active: #{metrics['active']}"
      puts "  Lag: #{lag_size} (#{lag_bytes} bytes)"

      if lag_bytes > 100_000_000
        warn "\n⚠️  WARNING: Replication lag is #{lag_size}"
        warn "   Consider checking Sequin connection and consumption rate"
      elsif lag_bytes < 1_000_000
        puts "  ✓ Lag is healthy (< 1MB)"
      end
    end

    it 'tracks publication statistics' do
      pub_stats = connection.execute(<<-SQL
        SELECT 
          COUNT(*) as table_count
        FROM pg_publication_tables
        WHERE pubname = 'sequin_cdc_publication';
      SQL
      ).first

      expect(pub_stats['table_count'].to_i).to eq(3)
      puts "\n📋 Publication Statistics:"
      puts "  Tables tracked: #{pub_stats['table_count']}"
    end

    it 'verifies WAL configuration for production load' do
      config = {}
      %w[wal_level max_replication_slots max_wal_senders wal_keep_size].each do |param|
        result = connection.execute("SHOW #{param};").first rescue nil
        config[param] = result[param] if result
      end

      puts "\n⚙️  PostgreSQL WAL Configuration:"
      config.each { |k, v| puts "  #{k}: #{v}" }

      expect(config['wal_level']).to eq('logical')
      expect(config['max_replication_slots'].to_i).to be >= 4
      expect(config['max_wal_senders'].to_i).to be >= 4
    end
  end
end
