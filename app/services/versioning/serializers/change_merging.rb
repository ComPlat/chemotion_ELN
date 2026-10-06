# frozen_string_literal: true

module Versioning
  module Serializers
    # Rebuilds a hash-valued column's full state from Logidze's partial diffs: merges a version's changes onto
    # the running state, applies removed sub-keys, and parses the stringified creation snapshot. Expects the
    # including serializer to provide `record`.
    module ChangeMerging
      # Marks a sub-key removed within a request while that request's versions are merged; see merge_change.
      REMOVED = Object.new.freeze

      private

      # The creation snapshot stores object-typed columns as JSON strings, which the column's own type
      # can't deserialize, so parse those back into hashes before merging.
      # Merging the versions saved by one request (within_request) keeps removals as REMOVED; merging onto the
      # running state applies and strips them.
      def merge_change(key, previous_value, value, within_request: false)
        return value unless hash_column?(key)

        value = stringified_hash(value)
        previous_value = stringified_hash(previous_value)
        unless previous_value.is_a?(Hash) && value.is_a?(Hash)
          return within_request || !value.is_a?(Hash) ? value : without_removals(value)
        end

        within_request ? merge_request_hashes(previous_value, value) : merge_hashes(previous_value, value)
      end

      # Deep merge that honours jsonb_diff's marker for a removed object-valued sub-key ('deleted'), dropping
      # the key instead of storing the marker as its value.
      def merge_hashes(previous_value, value)
        merged = previous_value.merge(value) { |_sub_key, old, new| merge_sub_value(old, new) }
        merged.reject { |sub_key, new| removal?(previous_value[sub_key], new) }
      end

      def merge_sub_value(old, new)
        return merge_hashes(old, new) if old.is_a?(Hash) && new.is_a?(Hash)

        new.is_a?(Hash) ? without_removals(new) : new
      end

      def removal?(old, new)
        new.equal?(REMOVED) || (new == 'deleted' && old.is_a?(Hash))
      end

      # Merges two versions of the same request. A 'deleted' marker that replaces a nested change made earlier
      # in the request is kept (as REMOVED) instead of being absorbed by it, so it still applies to the running
      # state.
      def merge_request_hashes(previous_value, value)
        previous_value.merge(value) do |_sub_key, old, new|
          if old.is_a?(Hash) && new.is_a?(Hash)
            merge_request_hashes(old, new)
          elsif old.is_a?(Hash) && new == 'deleted'
            REMOVED
          else
            new
          end
        end
      end

      def without_removals(hash)
        hash.each_with_object({}) do |(sub_key, value), result|
          next if value.equal?(REMOVED)

          result[sub_key] = value.is_a?(Hash) ? without_removals(value) : value
        end
      end

      def hash_column?(key)
        record.has_attribute?(key) && %i[hstore jsonb json].include?(record.type_for_attribute(key).type)
      end

      # jsonb_diff only records a removed sub-key when its old value was an object. In an hstore every value
      # is a string, so removals leave no trace, and a removal-only write is logged as a bare {}. Recover them
      # from the record's current value, the only complete state available: a sub-key that is gone now was
      # removed after its last mention, attributed to the first removal-only write after that, or failing
      # that, to the first later write touching the column. Returns { group index => { column => [sub-keys] } }.
      #
      # This is a best guess, because the log holds nothing that says when a removal happened:
      # - a removal made in the same save as other changes to the column shows under the first later save that
      #   touched the column, which may be an earlier one;
      # - sub-keys removed in different removal-only saves all show under the first of them;
      # - a sub-key that was removed and later re-added is not detected at all.
      # Getting this exact would need jsonb_diff to log removed keys.
      def sub_key_removals(change_groups)
        removals = Hash.new { |hash, index| hash[index] = Hash.new { |columns, column| columns[column] = [] } }
        change_groups.flat_map(&:keys).uniq.each do |column|
          column_removals(change_groups, column).each { |sub_key, index| removals[index][column] << sub_key }
        end
        removals
      end

      # { sub-key => index of the group it was removed in } for one column; see sub_key_removals.
      def column_removals(change_groups, column)
        current = current_sub_keys(column)
        return {} if current.nil?

        touched = change_groups.each_index.select { |index| change_groups[index].key?(column) }
        gone = last_mentions(change_groups, column, touched).except(*current)
        gone.transform_values { |mentioned_at| removal_index(change_groups, column, touched, mentioned_at) }.compact
      end

      # The column's current sub-keys, or nil when it isn't an hstore/jsonb object column.
      def current_sub_keys(column)
        return unless hash_column?(column)

        current = record.read_attribute(column)
        return [] if current.nil?

        current.keys if current.is_a?(Hash)
      end

      # { sub-key => index of the last group that mentions it } for one column.
      def last_mentions(change_groups, column, touched)
        touched.each_with_object({}) do |index, result|
          sub_keys = stringified_hash(change_groups[index][column])
          sub_keys.each_key { |sub_key| result[sub_key] = index } if sub_keys.is_a?(Hash)
        end
      end

      def removal_index(change_groups, column, touched, mentioned_at)
        later = touched.select { |index| index > mentioned_at }
        later.find { |index| change_groups[index][column] == {} } || later.first
      end

      # Logidze's snapshot (and full-snapshot logging) stringifies object-typed columns, e.g.
      # '{"content": "..."}' instead of a hash; return such a value as a hash, anything else as is.
      def stringified_hash(value)
        return value unless value.is_a?(String) && value.start_with?('{')

        parsed = JSON.parse(value)
        parsed.is_a?(Hash) ? parsed : value
      rescue JSON::ParserError
        value
      end
    end
  end
end
