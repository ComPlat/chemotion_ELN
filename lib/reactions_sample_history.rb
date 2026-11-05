# frozen_string_literal: true

# Reads the logidze row history (+log_data+) of reaction-sample links, samples and reactions, for data
# repairs.
#
# logidze stores the full row in the first version and only the changed columns in later versions. A jsonb
# column holds a nested diff of the changed keys, with +'deleted'+ for a removed object. Every version has
# +ts+ (milliseconds, taken from +updated_at+) and, once request metadata is recorded, +m.uuid+ (the request)
# and +m._r+ (the responsible user).
module ReactionsSampleHistory
  JSONB_COLUMNS = %w[gas_phase_data].freeze

  module_function

  # The versions of a row's history.
  #
  # @param log_data [Hash, String, nil] a +log_data+ value
  # @return [Array<Hash>] the versions, oldest first; empty without history
  def versions(log_data)
    data = parse_json(log_data)
    data.is_a?(Hash) ? Array(data['h']) : []
  end

  # The row as it was after the given versions.
  #
  # @param versions [Array<Hash>] consecutive versions, starting with the first one
  # @return [Hash{String => Object}] the row as these versions build it
  def snapshot(versions)
    versions.each_with_object({}) { |version, row| apply_changes(row, version['c']) }
  end

  # The request that wrote a version.
  #
  # @return [String, nil] the request uuid; nil for versions written without request metadata
  def request_uuid(version)
    version.dig('m', 'uuid')
  end

  # Splits a link's history into the stretches it spent in one reaction.
  #
  # @param versions [Array<Hash>] a reactions_samples history
  # @return [Array<Hash>] +{ reaction_id:, first:, last: }+ per stretch, with version indexes; empty when
  #   the first version names no reaction
  def reaction_stretches(versions)
    return [] if versions.empty? || versions.first['c']['reaction_id'].nil?

    versions.each_with_index.with_object([]) do |(version, index), stretches|
      reaction_id = version['c']['reaction_id']
      if stretches.empty? || (version['c'].key?('reaction_id') && reaction_id != stretches.last[:reaction_id])
        stretches << { reaction_id: reaction_id, first: index, last: index }
      else
        stretches.last[:last] = index
      end
    end
  end

  def apply_changes(row, changes)
    changes.each do |column, value|
      row[column] = JSONB_COLUMNS.include?(column) ? apply_diff(parse_json(row[column]), parse_json(value)) : value
    end
  end

  def apply_diff(value, diff)
    return diff unless value.is_a?(Hash) && diff.is_a?(Hash)

    diff.each_with_object(value.dup) do |(key, change), merged|
      if change == 'deleted' && merged[key].is_a?(Hash)
        merged.delete(key)
      else
        merged[key] = apply_diff(merged[key], change)
      end
    end
  end

  def parse_json(value)
    value.is_a?(String) ? JSON.parse(value) : value
  rescue JSON::ParserError
    value
  end
end
