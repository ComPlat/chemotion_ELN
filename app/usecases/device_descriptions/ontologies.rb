# frozen_string_literal: true

module Usecases
  module DeviceDescriptions
    class Ontologies
      def initialize
        @segment_klasses =
          Labimotion::SegmentKlass.where(
                                    segment_klasses: { is_active: true },
                                    element_klasses: { is_active: true, name: 'device_description'}
                                  ).joins(:element_klass)
        @ontologies = []
      end

      def execute
        return [] if @segment_klasses.blank?

        @segment_klasses.each do |segment_klass|
          segment_klass.properties_release['layers'].each do |layer|
            layer[1]['fields'].each do |field|
              next if field['ontology'].blank?

              @ontologies << field['ontology'].merge({ segment_klass_ids: [segment_klass.id] })
            end
          end
        end
        @ontologies.uniq
      end
    end
  end
end

[{ label: 'test', ids: [1,2]] }, { label: 'hallo', id: 3 }]