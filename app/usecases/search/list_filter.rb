# frozen_string_literal: true

module Usecases
  module Search
    # Intersects search result ids with the element list's active filters (My Labels, date range,
    # product only). The listing endpoints apply these as scopes; a search returns id lists, so the
    # same conditions have to be re-applied here or the chips would sit above unfiltered results.
    module ListFilter
      MODELS_BY_KEY = {
        sample_ids: 'Sample',
        reaction_ids: 'Reaction',
        wellplate_ids: 'Wellplate',
        screen_ids: 'Screen',
        research_plan_ids: 'ResearchPlan',
        cell_line_ids: 'CelllineSample',
        cellline_sample_ids: 'CelllineSample',
        sequence_based_macromolecule_sample_ids: 'SequenceBasedMacromoleculeSample',
        device_description_ids: 'DeviceDescription',
        element_ids: 'Labimotion::Element',
      }.freeze

      module_function

      # Reads the active filters out of the search request.
      def from_params(params)
        filters = params.dig(:selection, :list_filter_params) || {}

        {
          user_label: filters[:user_label].presence,
          from_date: filters[:from_date].presence,
          to_date: filters[:to_date].presence,
          by_created_at: filters[:filter_created_at] || false,
          product_only: filters[:product_only] || false,
        }
      end

      def active?(filters)
        filters[:user_label].present? || filters[:from_date].present? ||
          filters[:to_date].present? || filters[:product_only].present?
      end

      def apply(elements, filters)
        return elements unless active?(filters)

        elements.each_with_object({}) do |(key, ids), filtered|
          filtered[key] = matching_ids(MODELS_BY_KEY[key], ids, filters)
        end
      end

      # Keeps the incoming order, which the serializers rely on for paging.
      def matching_ids(model_name, ids, filters)
        return ids if model_name.blank? || ids.blank? || !active?(filters)

        kept = narrow(model_name.constantize.where(id: ids), model_name, filters).pluck(:id).to_set
        ids.select { |id| kept.include?(id.to_i) }
      end

      def narrow(scope, model_name, filters)
        scope = scope.by_user_label(filters[:user_label]) if filters[:user_label].present?
        scope = scope.product_only if filters[:product_only].present? && model_name == 'Sample'
        by_date(scope, filters)
      end

      # Mirrors the listing endpoints, down to the shared timestamp handling: the bounds arrive as
      # unix seconds of the browser's local midnight, and to_date covers the whole of its day.
      def by_date(scope, filters)
        from = filters[:from_date]
        to = filters[:to_date]
        return scope if from.blank? && to.blank?

        from_scope, to_scope =
          filters[:by_created_at] ? %i[created_time_from created_time_to] : %i[updated_time_from updated_time_to]
        scope = scope.public_send(from_scope, Time.zone.at(from.to_i)) if from.present?
        scope = scope.public_send(to_scope, Time.zone.at(to.to_i) + 1.day) if to.present?
        scope
      end
    end
  end
end
