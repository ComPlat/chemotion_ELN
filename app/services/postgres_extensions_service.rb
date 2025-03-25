# frozen_string_literal: true

class PostgresExtensionsService
  class << self
    # Execute a raw SQL query with sanitized arguments
    # @param sql [String] The SQL query to Execute
    # @param args [Array] The arguments to sanitize and inject into the SQL query
    def execute_function(sql, *args)
      return nil unless extension_valid?

      # Sanitize input arguments
      sanitized_args = args.map { |arg| connection.quote(arg) }

      # Inject sanitized arguments into the SQL string
      final_sql = sql % sanitized_args

      # Execute the query
      result = connection.execute(final_sql)

      # Format and return the result
      result = format_result(result)
      simple_output(result)
    end

    def extension_valid?
      raise NotImplementedError, 'Subclasses must implement this method'
    end

    private

    def connection
      @connection ||= ActiveRecord::Base.connection
    end

    # Convert raw SQL results to an array of hashes
    def format_result(result)
      result.map(&:symbolize_keys) # Converts keys to symbols for easier access
    end

    # Extract the result from a simple query result
    # @param result [Array] The result of a raw SQL query
    # @return [Object, self] The extracted result if it is simple, otherwise the original
    def simple_output(result)
      result.size == 1 && result.first.key?(:result) ? result.first[:result] : result
    rescue StandardError
      result
    end
  end
end
