# frozen_string_literal: true

module Usecases
  module DeviceDescriptions
    class Update
      attr_reader :params, :device_description, :current_user

      def initialize(params, device_description, current_user)
        @params = params
        @device_description = device_description
        @current_user = current_user
      end

      def execute
        ActiveRecord::Base.transaction do
          attributes = remove_ontologies_marked_as_deleted
          attributes = add_matching_segment_klasses(attributes)

          device_description.update!(attributes)

          device_description
        end
      end

      private

      def remove_ontologies_marked_as_deleted
        return params if params[:ontologies].blank?

        params[:ontologies].each_with_index do |ontology, i|
          params[:ontologies].delete_at(i) if ontology[:data][:is_deleted]
        end
        params
      end

      def add_matching_segment_klasses(attributes)
        return attributes if attributes[:ontologies].blank?
        return attributes if attributes[:ontologies] == device_description[:ontologies]

        segments = []

        attributes[:ontologies].each_with_index do |ontology, i|
          # was ist mit änderungen in den Feldern? => versions button

          segment_klasses = find_segment_klasses_by_ontology(ontology, attributes[:id])
          next if segment_klasses.blank?

          segment_ids = []
          segment_klasses.each do |segment_klass|
            segments << segment_klass
            segment_ids << { segment_klass_id: segment_klass.segment_klass_id }
          end
          attributes[:ontologies][i][:segments] = segment_ids
        end
        save_segments(segments)
        attributes
      end

      def find_segment_klasses_by_ontology(ontology, object_id)
        Labimotion::SegmentKlass
          .select(
            'segment_klasses.id AS segment_klass_id,
            CASE
              WHEN segments.properties IS NOT NULL THEN segments.properties
              ELSE segment_klasses.properties_template
            END AS properties',
          )
          .where("
            jsonb_path_query_array(
              segment_klasses.properties_template -> 'layers', '$.*.fields[*].ontology.short_form'
            )::TEXT ILIKE ?
            AND segment_klasses.is_active = ?
          ", "%#{ontology[:data][:short_form]}%", true)
          .joins("
            LEFT OUTER JOIN segments ON segments.segment_klass_id = segment_klasses.id
            AND segments.element_id = '#{object_id}'
            AND segments.element_type = 'DeviceDescription'
          ")
      end

      def save_segments(segments)
        return if segments.blank?

        device_description.save_segments(segments: segments, current_user_id: current_user.id)
      end
    end
  end
end
