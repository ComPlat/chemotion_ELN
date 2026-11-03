# frozen_string_literal: true

module Usecases
  module Reactions
    # Brings a value for `reactions.variations` into the shape db/schemas/reaction_variations.schema.json
    # describes, and the CHECK constraint `reactions_variations_is_diff_list` enforces: a list whose rows
    # each have an id, a number and a diff.
    #
    # Values reach the column from more than the current client: the History tab reverts to whatever
    # a version held, which may be empty, JSON text, or the object keyed by variation UUID that the
    # column held before 20260731120000_convert_reaction_variations_to_diff_list.rb. Such an object is
    # converted the way that migration converts it - its bodies kept under `legacy_data`, for
    # Usecases::Reactions::ConvertLegacyVariations to turn into diffs.
    class NormalizeVariations
      def self.call(value)
        new.call(value)
      end

      def call(value)
        value = parse(value)
        list = value.is_a?(Hash) ? from_legacy_object(value) : Array(value)
        list.each_with_index.filter_map { |item, index| normalize(item, index) }
      end

      private

      def parse(value)
        return value unless value.is_a?(String)
        return [] if value.blank?

        JSON.parse(value)
      rescue JSON::ParserError
        []
      end

      # `idx` is only filled in where it is missing: it is the number the row is known by, not its
      # position, so renumbering here would relabel rows behind the user's back.
      def normalize(item, index)
        return nil unless item.is_a?(Hash)

        item = item.deep_stringify_keys
        item['id'] = item['uuid'].presence || SecureRandom.uuid if item['id'].blank?
        item['idx'] = index unless item['idx'].is_a?(Integer)
        item['data'] ||= {}
        item
      end

      # The rows of the old object, in the order of the numbers they were known by - an object's keys
      # say nothing about the order the rows were added in.
      def from_legacy_object(object)
        rows = object.each_with_index.map { |(key, body), position| legacy_row(key, body, position) }
        rows.compact.sort_by { |row| row['idx'] }
      end

      def legacy_row(key, body, position)
        return nil unless body.is_a?(Hash)

        body = body.deep_stringify_keys
        id = body['uuid'].presence || key.to_s
        metadata = body['metadata'] || {}
        {
          'id' => id,
          'idx' => body['id'].to_s.match?(/\A\d+\z/) ? body['id'].to_i : position,
          'group' => legacy_group(metadata['group']),
          'analyses' => Array(metadata['analyses']),
          'notes' => metadata['notes'].to_s,
          'data' => { 'id' => id },
          'legacy_data' => body,
        }
      end

      def legacy_group(group)
        case group
        when Array then group
        when Hash then [group['group'] || 0, group['subgroup'] || 0]
        else [0, 0]
        end
      end
    end
  end
end
