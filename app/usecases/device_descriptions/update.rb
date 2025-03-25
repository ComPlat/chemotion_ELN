# frozen_string_literal: true

module Usecases
  module DeviceDescriptions
    class Update
      attr_reader :params, :device_description, :current_user

      def initialize(params, device_description, current_user)
        @params = params
        @device_description = device_description
        @segments = params[:segments]
        @current_user = current_user
      end

      def execute
        ActiveRecord::Base.transaction do
          attributes = remove_ontologies_marked_as_deleted
          # attributes = add_matching_segment_klasses(attributes)

          save_segments
          device_description.reload
          device_description.update!(attributes.except(:segments))

          device_description
        end
      end

      def segment_klass_ids_by_new_ontology
        segment_klasses = find_segment_klasses_by_ontology(params[:ontology], params[:id])
        return [] if segment_klasses.blank?

        segment_ids = []
        segment_klasses.map do |segment_klass|
          segment_ids << { segment_klass_id: segment_klass.segment_klass_id, show: true }
        end
        segment_ids
      end

      private

      def remove_ontologies_marked_as_deleted
        return params if params[:ontologies].blank?

        ontology_params = []
        params[:ontologies].each do |ontology|
          if ontology[:data][:is_deleted]
            remove_segments_of_deleted_ontology(ontology)
          else
            ontology_params << ontology
          end
        end
        params[:ontologies] = ontology_params
        params
      end

      def remove_segments_of_deleted_ontology(ontology)
        return if ontology[:segments].blank?

        ontology[:segments].each do |segment|
          labimotion_segments = Labimotion::Segment.where(segment_klass_id: segment[:segment_klass_id])
          labimotion_segments.delete_all if labimotion_segments.present?
          idx = @segments.index { |s| s[:segment_klass_id] == segment[:segment_klass_id] }
          @segments.delete_at(idx) if idx.present?
        end
      end

      # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
      def add_matching_segment_klasses(attributes)
        return attributes if attributes[:ontologies].blank?
        return attributes if attributes[:ontologies] == device_description[:ontologies]

        attributes[:ontologies].each_with_index do |ontology, i|
          # TODO: has ontology segments? if not search for new segments
          segment_klasses = find_segment_klasses_by_ontology(ontology, attributes[:id])
          next if segment_klasses.blank?

          segment_ids = []
          segment_klasses.map do |segment_klass|
            segment_index =
              if ontology[:segments].present?
                ontology[:segments].index { |s| s[:segment_klass_id] == segment_klass.segment_klass_id }
              end
            show_value =
              if segment_index.present? && ontology[:segments][segment_index].key?('show')
                ontology[:segments][segment_index][:show]
              else
                true
              end
            segment_ids << { segment_klass_id: segment_klass.segment_klass_id, show: show_value }
          end
          attributes[:ontologies][i][:segments] = segment_ids
        end

        attributes
      end
      # rubocop:enable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

      def find_segment_klasses_by_ontology(ontology, object_id)
        Labimotion::SegmentKlass
          .select(
            'segment_klasses.id AS segment_klass_id,
            CASE
              WHEN segments.properties IS NOT NULL THEN segments.properties
              ELSE segment_klasses.properties_template
            END AS properties',
          )
          .where(segment_klasses: { is_active: true })
          .where(ontology_query_for_segment_klasses(ontology))
          .joins("
            LEFT OUTER JOIN segments ON segments.segment_klass_id = segment_klasses.id
            AND segments.element_id = '#{object_id}'
            AND segments.element_type = 'DeviceDescription'
          ")
      end

      def ontology_query_for_segment_klasses(ontology)
        query = "jsonb_path_query_array(
                  segment_klasses.properties_template -> 'layers', '$.*.fields[*].ontology.short_form'
                )::TEXT ILIKE '%#{ontology[:data][:short_form]}%'"
        ontology[:paths].each do |path|
          query += "OR
                    jsonb_path_query_array(
                      segment_klasses.properties_template -> 'layers', '$.*.fields[*].ontology.short_form'
                    )::TEXT ILIKE '%#{path[:short_form]}%'"
        end
        query
      end

      def extract_segments(ontology, segment_klass, segments)
        idx =
          if ontology[:segments].present?
            ontology[:segments].index { |s| s[:segment_klass_id] == segment_klass.segment_klass_id }
          end

        segments << ontology[:segments][idx][:segment] if idx.present? && ontology[:segments][idx][:segment].present?
        segments
      end

      def segments_to_save
        segments = []
        @segments.each_with_index do |segment, i|
          dd_index = device_description.segments.index { |s| s[:id] == segment[:id] }
          dd_segment = device_description.segments[dd_index ||= i]
          layer = dd_segment.present? ? dd_segment.properties['layers'] : []
          next if dd_index.present? && layer == segment['properties']['layers']

          segments << segment
        end
        segments
      end

      def save_segments
        return if @segments.blank?

        device_description.save_segments(segments: segments_to_save, current_user_id: current_user.id)
      end
    end
  end
end
