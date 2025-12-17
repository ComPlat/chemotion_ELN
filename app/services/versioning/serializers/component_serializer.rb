# frozen_string_literal: true

module Versioning
  module Serializers
    class ComponentSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name)
        new(record: record, name: name).call
      end

      def field_definitions
        {
          component_properties: {
            label: 'Component Properties',
            revert: %i[component_properties],
            formatter: json_formatter,
            kind: :json,
          },
        }.with_indifferent_access
      end

      private

      def json_formatter
        lambda do |key, value|
          default_formatter.call(key, value) || []
        end
      end
    end
  end
end
