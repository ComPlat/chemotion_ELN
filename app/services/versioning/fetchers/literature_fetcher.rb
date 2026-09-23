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

          merge_by_request(
            literals.flat_map { |literal| Versioning::Serializers::LiteralSerializer.call(literal, name) } +
            Versioning::Serializers::LiteratureSerializer.call(literature, name),
          )
        end
      end

      private

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
