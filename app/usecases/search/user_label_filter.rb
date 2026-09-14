# frozen_string_literal: true

module Usecases
  module Search
    # Intersects search result ids with the element list's active My Labels filter.
    module UserLabelFilter
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

      # Reads the label id out of the search request, nil when no label filter is active.
      def label_id(params)
        params.dig(:selection, :list_filter_params, :user_label).presence
      end

      def apply(elements, user_label)
        return elements if user_label.blank?

        elements.each_with_object({}) do |(key, ids), filtered|
          filtered[key] = labelled_ids(MODELS_BY_KEY[key], ids, user_label)
        end
      end

      # Keeps the incoming order, which the serializers rely on for paging.
      def labelled_ids(model_name, ids, user_label)
        return ids if model_name.blank? || ids.blank?

        labelled = model_name.constantize.where(id: ids).by_user_label(user_label).pluck(:id).to_set
        ids.select { |id| labelled.include?(id.to_i) }
      end
    end
  end
end
