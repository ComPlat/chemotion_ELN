# frozen_string_literal: true

module Versioning
  module Serializers
    class LiteratureSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name = ['Properties'])
        new(record: record, name: name).call
      end

      def field_definitions
        {
          title: {
            label: 'Title',
          },
          url: {
            label: 'URL',
          },
          doi: {
            label: 'DOI',
          },
          isbn: {
            label: 'ISBN',
          },
        }.with_indifferent_access
      end
    end
  end
end
