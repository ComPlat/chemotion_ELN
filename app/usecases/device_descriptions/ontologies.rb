# frozen_string_literal: true

module Usecases
  module DeviceDescriptions
    class Ontologies
      def initialize
        @segment_klasses =
          Labimotion::SegmentKlass.where(
            segment_klasses: { is_active: true },
            element_klasses: { is_active: true, name: 'device_description' },
          ).joins(:element_klass)
        @ontologies = []
      end

      def execute
        return [] if @segment_klasses.blank?

        @segment_klasses.each do |segment_klass|
          segment_klass.properties_release['layers'].each do |layer|
            layer[1]['fields'].each do |field|
              next if field['ontology'].blank?

              set_ontologies(field, segment_klass)
            end
          end
        end
        @ontologies.sort_by { |o| o['label'].downcase }
      end

      def set_ontologies(field, segment_klass)
        position = @ontologies.find_index { |o| o['short_form'] == field['ontology']['short_form'] }

        if position.present?
          unless @ontologies[position]['segment_ids'].include?(segment_klass.id)
            @ontologies[position]['segment_ids'].push(segment_klass.id)
          end
        else
          @ontologies << field['ontology'].merge({ 'segment_ids' => [segment_klass.id] })
        end
      end
    end
  end
end
