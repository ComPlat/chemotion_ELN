# frozen_string_literal: true

module Versioning
  module Serializers
    class CollectionSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name = ['Collection'])
        new(record: record, name: name).call
      end

      def field_definitions
        {
          label: {
            label: 'Label',
          },
        }.with_indifferent_access
      end
    end
  end
end
