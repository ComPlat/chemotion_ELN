# frozen_string_literal: true

# Helper methods for waiting and querying WAL/replication slot state in specs
module WalHelpers
  def current_wal_position
    ActiveRecord::Base.connection.execute("SELECT pg_current_wal_lsn() as lsn;").first['lsn']
  end

  def replication_slot_position
    result = ActiveRecord::Base.connection.execute(<<-SQL
      SELECT confirmed_flush_lsn as lsn
      FROM pg_replication_slots
      WHERE slot_name = 'sequin_slot';
    SQL
    ).first
    result&.[]('lsn')
  end

  def wal_lag_bytes
    result = ActiveRecord::Base.connection.execute(<<-SQL
      SELECT pg_wal_lsn_diff(
        pg_current_wal_lsn(),
        confirmed_flush_lsn
      ) as lag_bytes
      FROM pg_replication_slots
      WHERE slot_name = 'sequin_slot';
    SQL
    ).first
    result&.[]('lag_bytes')&.to_i || 0
  end

  # Wait until WAL advances past a previous LSN. Returns true if advanced.
  def wait_for_wal_advance(prev_lsn, timeout: 5)
    connection = ActiveRecord::Base.connection
    start = Time.now
    loop do
      diff_row = connection.execute("SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '#{prev_lsn}') as diff;")
      diff = diff_row.first && diff_row.first['diff'] ? diff_row.first['diff'].to_i : 0
      return true if diff > 0
      if (Time.now - start) > timeout
        # Try forcing a WAL switch as a last resort (may require permissions)
        begin
          connection.execute("SELECT pg_switch_wal();")
        rescue StandardError => e
          warn "pg_switch_wal failed or not permitted: #{e.message}"
        end
        # give it a little time
        sleep 1
        # re-check once
        diff_row = connection.execute("SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '#{prev_lsn}') as diff;")
        diff = diff_row.first && diff_row.first['diff'] ? diff_row.first['diff'].to_i : 0
        return true if diff > 0
        raise "WAL did not advance after forcing switch within #{timeout + 1}s"
      end
      sleep 0.1
    end
  rescue => e
    warn "WAL advance wait failed: "+e.message
    false
  end
end

RSpec.configure do |c|
  c.include WalHelpers
end
