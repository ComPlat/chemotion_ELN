# frozen_string_literal: true

module Versioning
  module Fetchers
    class LiteratureFetcher
      include ActiveModel::Model

      attr_accessor :element

      def self.call(**args)
        new(**args).call
      end

      # A literature can be linked to the same element several times (one literal per citation type),
      # so serialize its own changes only once.
      def call
        element.literals.with_deleted.with_log_data.group_by(&:literature_id).flat_map do |literature_id, literals|
          literature = Literature.with_deleted.with_log_data.find(literature_id)
          name = ["Reference: #{reference_label(literature)}"]

          literal_versions = literals.flat_map do |literal|
            Versioning::Serializers::LiteralSerializer.call(literal, name)
          end
          literature_versions = linked_literature_versions(
            Versioning::Serializers::LiteratureSerializer.call(literature, name), literals, literal_versions
          )

          merge_by_request(literal_versions + literature_versions)
        end
      end

      private

      # A literature is shared by all elements citing it: only show its changes from the time it is linked to this
      # element, i.e. made in the same request as one of the literals or later.
      def linked_literature_versions(literature_versions, literals, literal_versions)
        request_uuids = literal_versions.pluck(:uuid).compact
        linked_since = literals.map(&:created_at).min.change(usec: 0)

        literature_versions.select do |version|
          request_uuids.include?(version[:uuid]) || version[:time] >= linked_since
        end
      end

      # For the user, the literal and its literature are one reference: changes to both made in the same request
      # are shown as a single entry.
      def merge_by_request(versions)
        versions.group_by { |version| version[:uuid] }.map do |_uuid, request_versions|
          request_versions.first.merge(changes: request_versions.map { |version| version[:changes] }.reduce(:merge))
        end
      end

      def reference_label(literature)
        literature.title.presence || literature.doi.presence || literature.url.presence || literature.isbn.presence ||
          literature.id
      end
    end
  end
end
