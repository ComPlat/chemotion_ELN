# frozen_string_literal: true

# rubocop:disable Metrics/BlockLength, Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Metrics/MethodLength

module Versioning
  module Serializers
    class BaseSerializer
      include ActiveModel::Model

      # Part of the cache key: bump it whenever the way histories are computed changes, so entries built by
      # older code aren't served until each record happens to be touched again.
      CACHE_VERSION = 2

      attr_accessor :record, :name

      def call
        Rails.cache.fetch("versions/v#{CACHE_VERSION}/#{record.cache_key}", version: record.cache_version) do
          result = [] # result data
          base = {} # track current version data
          return [] unless log_data

          groups = log_data.versions.group_by { |version| version.data.dig('m', 'uuid') }.map do |uuid, versions|
            changes = versions.each_with_object({}) do |version, hash|
              hash.merge!(version.changes) { |key, previous, value| merge_change(key, previous, value) }
            end
            [uuid, versions, changes]
          end
          removals = sub_key_removals(groups.map(&:last))

          groups.each_with_index do |(uuid, versions, changes), index|
            user_id = versions.first.data.dig('m', '_r')
            time = versions.first.data['ts'] / 1000
            changes_comparison_hash = {} # hash for changes comparison
            revertible = changes.none? { |key, _v| key == 'created_at' }
            changes.each do |key, value|
              previous_value = base[key]

              # Deep-merge hash-valued changes (e.g. extended_metadata) instead of overwriting them outright.
              # Logidze's jsonb diff only stores the sub-keys that actually changed in a given version, so
              # `value` here may be a partial hash - merge it onto the previous full value so both the stored
              # `base` and the "new" side of the comparison below reflect the complete, current state instead
              # of losing (or, on the "new" side, spuriously blanking) sub-keys this version didn't touch.
              value = merge_change(key, previous_value, value)
              value = value.except(*removals[index][key]) if value.is_a?(Hash) && removals.dig(index, key)
              base[key] = value

              next if value == previous_value # ignore if value is same as in last version
              next if blank?(previous_value) && blank?(value) # ignore if value is empty

              fields = field_definitions[key]
              next if fields.nil?

              fields = [fields] unless fields.is_a?(Array)
              fields.each do |field|
                formatter = field[:formatter] || default_formatter
                # A Quill field's formatter normalizes blank deltas for display; revert to the stored value instead.
                revertible_value_formatter = field[:revertible_value_formatter] ||
                                             (field[:kind] == :quill ? default_formatter : formatter)

                old_value = formatter.call(key, previous_value)
                new_value = formatter.call(key, value)
                current_value = formatter.call(key, record.read_attribute_before_type_cast(key))
                revertible_value = revertible_value_formatter.call(key, previous_value)
                next if old_value == new_value # ignore if value is same as in last version
                next if old_value.blank? && new_value.blank? # ignore if value is empty or nil

                changes_comparison_hash[field[:name] || key] = {
                  label: field[:label],
                  old_value: old_value,
                  new_value: new_value,
                  current_value: current_value,
                  kind: field[:kind] || :string,
                  revert: (revertible && field[:revert]) || [],
                  revertible_value: revertible_value,
                }
              end
            end
            next if changes_comparison_hash.empty?

            result << {
              db_id: record.id,
              klass_name: klass_name, # record class (sampe, reaction, ...)
              name: name, # record name (uses as default the name attribute
              # but in case the model doesn't have a name field or you want to change it)
              time: Time.zone.at(time), # timestamp of the change
              user: version_user_names_lookup[user_id], # user
              uuid: uuid, # request group
              changes: changes_comparison_hash, # changes hash
            }
          end

          result
        end
      end

      private

      def klass_name
        record.class.to_s
      end

      def blank?(value)
        value.blank? || value.in?(['(,)', '{}', []])
      end

      def version_user_names_lookup
        @version_user_names_lookup ||= begin
          ids = Set.new

          record.log_data.versions.each do |v|
            ids << v.data.dig('m', '_r')
            ids << v.changes['created_by'] if v.changes.key?('created_by')
            ids << v.changes['created_for'] if v.changes.key?('created_for')
          end

          User.with_deleted.where(id: ids).to_h { |u| [u.id, u.name] }
        end
      end

      delegate :log_data, to: :record

      def default_formatter
        ->(key, value) { record.instance_variable_get(:@attributes)[key].type.deserialize(value) }
      end

      def user_formatter
        ->(_key, value) { version_user_names_lookup[value] }
      end

      def jsonb_formatter(*attributes)
        ->(key, value) { default_formatter.call(key, value)&.dig(*attributes) }
      end

      def array_formatter
        lambda { |key, value|
          array = default_formatter.call(key, value)
          array = [array] unless array.instance_of?(Array)

          array&.join("\n")
        }
      end

      def non_formatter
        ->(_key, value) { value }
      end

      def quill_formatter
        ->(key, value) { normalize_quill_delta(default_formatter.call(key, value)) }
      end

      # An untouched Quill editor still autosaves a delta like {"ops"=>[{"insert"=>"\n"}]}, which
      # isn't the same value as nil/{} but is visually just as empty - normalize it so it doesn't
      # get treated as a real content change in the history view.
      def normalize_quill_delta(delta)
        Chemotion::QuillToPlainText.blank_content?(delta) ? {} : delta
      end

      # The creation snapshot stores object-typed columns as JSON strings, which the column's own type
      # can't deserialize, so parse those back into hashes before merging.
      def merge_change(key, previous_value, value)
        return value unless hash_column?(key)

        value = stringified_hash(value)
        previous_value = stringified_hash(previous_value)
        previous_value.is_a?(Hash) && value.is_a?(Hash) ? merge_hashes(previous_value, value) : value
      end

      # Deep merge that honours jsonb_diff's marker for a removed object-valued sub-key ('deleted'), dropping
      # the key instead of storing the marker as its value.
      def merge_hashes(previous_value, value)
        merged = previous_value.merge(value) do |_sub_key, old, new|
          old.is_a?(Hash) && new.is_a?(Hash) ? merge_hashes(old, new) : new
        end
        merged.reject { |sub_key, new| new == 'deleted' && previous_value[sub_key].is_a?(Hash) }
      end

      def hash_column?(key)
        record.has_attribute?(key) && %i[hstore jsonb json].include?(record.type_for_attribute(key).type)
      end

      # jsonb_diff only records a removed sub-key when its old value was an object. In an hstore every value
      # is a string, so removals leave no trace, and a removal-only write is logged as a bare {}. Recover them
      # from the record's current value, the only complete state available: a sub-key that is gone now was
      # removed after its last mention, attributed to the first removal-only write after that, or failing
      # that, to the first later write touching the column. Returns { group index => { column => [sub-keys] } }.
      # A sub-key that was removed and later re-added cannot be detected this way.
      def sub_key_removals(change_groups)
        removals = Hash.new { |hash, index| hash[index] = Hash.new { |columns, column| columns[column] = [] } }
        change_groups.flat_map(&:keys).uniq.each do |column|
          next unless hash_column?(column)

          current = record.read_attribute(column)
          next unless current.nil? || current.is_a?(Hash)

          touched = change_groups.each_index.select { |index| change_groups[index].key?(column) }
          last_mention = {}
          touched.each do |index|
            sub_keys = stringified_hash(change_groups[index][column])
            sub_keys.each_key { |sub_key| last_mention[sub_key] = index } if sub_keys.is_a?(Hash)
          end

          last_mention.each do |sub_key, mentioned_at|
            next if current&.key?(sub_key)

            later = touched.select { |index| index > mentioned_at }
            removed_at = later.find { |index| change_groups[index][column] == {} } || later.first
            removals[removed_at][column] << sub_key if removed_at
          end
        end
        removals
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

      def fix_malformed_value_formatter
        lambda do |key, value|
          if value.is_a?(String) && value.start_with?('{')
            YAML.safe_load(value)
          else
            default_formatter.call(key, value)
          end
        end
      end

      def svg_path_formatter(entity)
        lambda do |key, value|
          result = default_formatter.call(key, value)
          return result if result.blank?

          "/images/#{entity}/#{result}"
        end
      end
    end
  end
end
# rubocop:enable Metrics/BlockLength, Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Metrics/MethodLength
