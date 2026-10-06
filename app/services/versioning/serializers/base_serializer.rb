# frozen_string_literal: true

# rubocop:disable Metrics/BlockLength, Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Metrics/MethodLength

module Versioning
  module Serializers
    class BaseSerializer
      include ActiveModel::Model
      include ChangeMerging

      # Part of the cache key: bump it whenever the way histories are computed changes, so entries built by
      # older code aren't served until each record happens to be touched again.
      CACHE_VERSION = 7

      attr_accessor :record, :name

      def call
        Rails.cache.fetch("versions/v#{CACHE_VERSION}/#{record.cache_key}", version: record.cache_version) do
          result = [] # result data
          base = {} # track current version data
          return [] unless log_data

          # Group consecutive versions saved by the same request. Versions saved outside a request (background
          # jobs, rake tasks) have no uuid and each stand alone, so the running state is built in time order.
          chunks = log_data.versions.chunk_while do |previous, version|
            uuid = previous.data.dig('m', 'uuid')
            uuid.present? && uuid == version.data.dig('m', 'uuid')
          end
          groups = chunks.map do |versions|
            changes = versions.each_with_object({}) do |version, hash|
              hash.merge!(version.changes) do |key, previous, value|
                merge_change(key, previous, value, within_request: true)
              end
            end
            [versions.first.data.dig('m', 'uuid'), versions, changes]
          end
          removals = sub_key_removals(groups.map(&:last))

          groups.each_with_index do |(uuid, versions, changes), index|
            user_id = versions.first.data.dig('m', '_r')
            time = Rational(versions.first.data['ts'], 1000) # keep the milliseconds for ordering
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
              removed_sub_keys = removals.dig(index, key)
              value = value.except(*removed_sub_keys) if removed_sub_keys && value.is_a?(Hash)
              base[key] = value

              next if value == previous_value # ignore if value is same as in last version
              next if blank?(previous_value) && blank?(value) # ignore if value is empty

              fields = field_definitions[key]
              next if fields.nil?

              fields = [fields] unless fields.is_a?(Array)
              fields.each do |field|
                # Quill fields default to quill_formatter, which normalizes blank deltas for display, and revert to
                # the stored value instead.
                quill = field[:kind] == :quill
                formatter = field[:formatter] || (quill ? quill_formatter : default_formatter)
                revertible_value_formatter = field[:revertible_value_formatter] ||
                                             (quill ? default_formatter : formatter)

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

      def fix_malformed_value_formatter
        lambda do |key, value|
          parsed = stringified_hash(value)
          parsed.is_a?(Hash) ? parsed : default_formatter.call(key, value)
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
