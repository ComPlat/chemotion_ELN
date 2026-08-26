# frozen_string_literal: true

# Verifies the connection-resilience fix: a PG backend killed while the SDF importer is busy in native
# OpenBabel code must NOT take the import down.
#
# Runs the same three checks on any branch, so `main` and this branch can be compared
# directly. See test_data/sdf_import/REPRODUCTION_GUIDE.md.
# 
# Docker / database setup:
#
# 1. Check which PostgreSQL databases are available:
#
#      psql -h postgres -U postgres -l
#
# 2. If the test database does not exist, create it:
#
#      psql -h postgres -U postgres -d postgres \
#        -c "CREATE DATABASE chemotion_test;"
#
# 3. Set up the Rails schema:
#
#      DATABASE_URL=postgres://postgres@postgres:5432/chemotion_test \
#        bundle exec rails db:migrate
#
# 4. Set DATABASE_URL to the test database and run the script:
#
#      DATABASE_URL=postgres://postgres@postgres:5432/chemotion_test \
#        bundle exec rails runner test_data/sdf_import/verify_connection_resilience.rb
# 
# Environment:
#   RECORDS=60    how many SDF records to import (default 60)
#   KILL_AT=10    kill the backend during the Nth native call (0 = never)
#   SDF=path      SDF file (default test_data/sdf_import/alex_clark_structures.sdf)

require 'pg'

RECORDS = Integer(ENV.fetch('RECORDS', 60))
KILL_AT = Integer(ENV.fetch('KILL_AT', 10))
SDF_PATH = ENV.fetch('SDF', Rails.root.join('test_data/sdf_import/alex_clark_structures.sdf').to_s)

def db_conf
  ActiveRecord::Base.connection_db_config.configuration_hash
end

def say(msg)
  puts msg
  $stdout.flush
end

# A second, independent libpq connection. Standing in for whatever kills the connection in
# production -- an idle reaper, a NAT timeout, a pgbouncer server_idle_timeout, or the OOM
# killer taking a postgres backend with it. From the client's side all of them look the same.
def with_side_channel
  conn = PG.connect(
    host: db_conf[:host], port: db_conf[:port] || 5432,
    user: db_conf[:username], password: db_conf[:password],
    dbname: db_conf[:database], application_name: 'resilience-killer',
  )
  yield conn
ensure
  conn&.close
end

def backend_pid
  ActiveRecord::Base.connection.execute('SELECT pg_backend_pid() AS pid').first['pid'].to_i
end

# Kills every backend on this database except the killer's own.
def drop_all_connections!
  with_side_channel do |conn|
    conn.exec(<<~SQL).ntuples
      SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND application_name IS DISTINCT FROM 'resilience-killer'
    SQL
  end
end

DROP_ALL_CONNECTIONS = -> { drop_all_connections! }

# ---------------------------------------------------------------------------------------
# Check 1 -- the mechanism, independent of any import code.
#
# ActiveRecord only re-verifies (and transparently reconnects) a connection when it is
# checked OUT of the pool: ConnectionPool#checkout -> checkout_and_verify -> verify!.
# A connection held across the whole job never passes through that gate again, so the first
# query after the server hangs up raises PG::ConnectionBad -- and keeps raising.
# ---------------------------------------------------------------------------------------
def check_mechanism
  say "\n=== Check 1: does releasing the connection let AR recover from a killed backend? ==="

  results = {}

  ActiveRecord::Base.connection.execute('SELECT 1')
  pid_before = backend_pid
  drop_all_connections!
  results[:held] =
    begin
      ActiveRecord::Base.connection.execute('SELECT 1')
      :survived
    rescue StandardError => e
      "died: #{e.class}"
    end

  ActiveRecord::Base.connection_pool.release_connection
  ActiveRecord::Base.connection.execute('SELECT 1')
  ActiveRecord::Base.connection_pool.release_connection
  drop_all_connections!
  results[:released] =
    begin
      ActiveRecord::Base.connection.execute('SELECT 1')
      :survived
    rescue StandardError => e
      "died: #{e.class}"
    end

  say "  backend pid before kill : #{pid_before}"
  say "  connection HELD open    : #{results[:held]}"
  say "  connection RELEASED     : #{results[:released]}"
  ActiveRecord::Base.connection_pool.release_connection
  results
end

# ---------------------------------------------------------------------------------------
# Check 2 -- the real importer, with a backend kill landing inside the native window.
#
# The hook fires from inside Chemotion::OpenBabelService, i.e. exactly while the importer is
# doing multi-second native work. On a branch that releases the connection first, the kill
# lands on a pooled connection and the next checkout re-establishes it. On a branch that does
# not, the kill lands on a connection that is checked out -- and, in the rows path, on one with
# an open transaction.
# ---------------------------------------------------------------------------------------
module KillOnNthNativeCall
  class << self
    attr_accessor :calls, :kill_at, :killed

    def arm!(kill_at)
      self.calls = 0
      self.kill_at = kill_at
      self.killed = false
    end

    def tick!
      self.calls += 1
      return unless kill_at.positive? && calls == kill_at && !killed

      self.killed = true
      DROP_ALL_CONNECTIONS.call
      warn "  [killer] terminated all backends during native call ##{calls}"
    end
  end

  def molecule_info_from_molfile(*args, **kwargs)
    KillOnNthNativeCall.tick!
    super
  end

  def molecule_info_from_molfiles(*args, **kwargs)
    KillOnNthNativeCall.tick!
    super
  end
end

def seed_owner
  user = User.find_by(email: 'verify-resilience@example.org')
  user ||= Person.create!(
    email: 'verify-resilience@example.org', password: 'verifyresiliencepw', first_name: 'Verify',
    last_name: 'SixTwoSix', name_abbreviation: 'V62',
  )
  collection = Collection.find_or_create_by!(user_id: user.id, label: 'verify-resilience')
  [user, collection]
end

def sdf_records(limit)
  records = []
  buffer = +''
  File.foreach(SDF_PATH) do |line|
    buffer << line
    next unless line.start_with?('$$$$')

    records << buffer
    buffer = +''
    break if records.size >= limit
  end
  records
end

def run_import(label, kill_at:)
  user, collection = seed_owner
  raw = sdf_records(RECORDS)
  KillOnNthNativeCall.arm!(kill_at)

  samples_before = Sample.count
  molecules_before = Molecule.count
  started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  escaped = nil

  importer = Import::ImportSdf.new(
    collection_id: collection.id, current_user_id: user.id, raw_data: raw,
  )
  begin
    importer.import_from_file
  rescue StandardError => e
    escaped = "#{e.class}: #{e.message.to_s.lines.first.to_s.strip}"
  end

  elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC) - started

  # Measure on a freshly checked-out connection. If the importer left a dead one behind, that
  # is the importer's failure to report -- not a reason for the harness to blow up.
  ActiveRecord::Base.connection_pool.release_connection
  created = Sample.count - samples_before

  say "\n--- #{label} ---"
  say format('  records offered      : %d', raw.size)
  say format('  samples created      : %d', created)
  say format('  molecules created    : %d', Molecule.count - molecules_before)
  say format('  molecule entries kept: %d/%d', importer.processed_mol.compact.size, raw.size)
  say format('  unprocessable rows   : %d', importer.unprocessable_samples.size)
  say format('  backend killed       : %s', KillOnNthNativeCall.killed ? "yes (native call ##{kill_at})" : 'no')
  say format('  exception escaped    : %s', escaped || 'none')
  say format('  wall clock           : %.1fs', elapsed)

  { label: label, offered: raw.size, created: created, escaped: escaped,
    unprocessable: importer.unprocessable_samples.size, seconds: elapsed }
end

# ---------------------------------------------------------------------------------------

Chemotion::OpenBabelService.singleton_class.prepend(KillOnNthNativeCall)

say "database : #{db_conf[:database]} @ #{db_conf[:host]}"
say "branch   : #{(`git rev-parse --abbrev-ref HEAD 2>/dev/null`.strip.presence || 'unknown')} " \
    "(#{`git rev-parse --short HEAD 2>/dev/null`.strip})"
say "sdf      : #{SDF_PATH} (#{RECORDS} records)"

mechanism = check_mechanism
baseline = run_import('Baseline: no connection kill', kill_at: 0)
killed = run_import("Under a dropped connection (kill at native call #{KILL_AT})", kill_at: KILL_AT)

say "\n=== Verdict ==="
say "  mechanism  held=#{mechanism[:held]}  released=#{mechanism[:released]}"
say format('  baseline   %d/%d samples, escaped=%s', baseline[:created], baseline[:offered], baseline[:escaped] || 'none')
say format('  killed     %d/%d samples, escaped=%s', killed[:created], killed[:offered], killed[:escaped] || 'none')

fixed = killed[:escaped].nil? && killed[:created] >= baseline[:created] - 1
say(fixed ? "\n  PASS -- the import survived the dropped connection." : "\n  FAIL -- the dropped connection took the import down.")
exit(fixed ? 0 : 1)
