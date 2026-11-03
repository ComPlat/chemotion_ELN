# frozen_string_literal: true

module InventoryIntegration
  # Builds the bounded report of one sync run (chemotion.inventory.run_report/v1), slice by slice.
  class RunReport
    FORMAT = 'chemotion.inventory.run_report/v1'
    SCHEMA_PATH = File.expand_path('run_report/v1.schema.json', __dir__)
    MAX_ERRORS = 200
    MAX_EXAMPLES = 5
    ERROR_DETAILS = %i[external_id phase field value].freeze
    COUNTS = %w[
      seen created updated unchanged tombstoned out_of_scope conflicts errors skipped unresolved_substances
    ].freeze

    def self.schema
      @schema ||= SchemaValidator.load(SCHEMA_PATH)
    end

    # Resumes a report stored by an earlier slice of the same run.
    def self.from_h(hash)
      new.tap { |report| report.instance_variable_set(:@data, hash.deep_stringify_keys) }
    end

    def initialize(run: {})
      @data = {
        'format' => FORMAT,
        'run' => run.deep_stringify_keys,
        'source' => {},
        'counts' => COUNTS.index_with(0),
        'substances' => { 'lookups' => 0, 'by_source' => {} },
        'http' => { 'requests' => 0, 'by_status' => {}, 'retries' => 0 },
        'error_summary' => [],
        'errors' => [],
        'warnings' => [],
        'tombstone_guard' => nil,
        'dry_run' => nil,
        'notes' => [],
      }
    end

    def increment(count, by = 1)
      key = count.to_s
      raise ArgumentError, "unknown count '#{key}'" unless COUNTS.include?(key)

      @data['counts'][key] += by
    end

    def merge_section(section, values)
      @data.fetch(section.to_s).merge!(values.deep_stringify_keys)
    end

    # Every error is counted in error_summary; only the first MAX_ERRORS are kept in detail.
    # @param details [Hash] optional external_id, phase, field and value
    def add_error(code, message, **details)
      increment(:errors)
      summary = @data['error_summary'].find { |entry| entry['code'] == code }
      summary ? summary['count'] += 1 : @data['error_summary'] << { 'code' => code, 'count' => 1 }
      return if @data['errors'].size >= MAX_ERRORS

      entry = { 'code' => code, 'message' => message }
      @data['errors'] << entry.merge(details.slice(*ERROR_DETAILS).compact.stringify_keys)
    end

    def add_warning(code, example: nil)
      warning = @data['warnings'].find { |entry| entry['code'] == code }
      warning ||= { 'code' => code, 'count' => 0, 'examples' => [] }.tap { |entry| @data['warnings'] << entry }
      warning['count'] += 1
      warning['examples'] << example if example && warning['examples'].size < MAX_EXAMPLES
    end

    def note(text)
      @data['notes'] << text
    end

    def to_h
      @data.deep_dup
    end
  end
end
