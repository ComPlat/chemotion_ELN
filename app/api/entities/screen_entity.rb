# frozen_string_literal: true

module Entities
  class ScreenEntity < ApplicationEntity
    # rubocop:disable Layout/ExtraSpacing
    with_options(anonymize_below: 0) do
      expose! :id
      expose! :type
      expose! :name
      expose! :is_restricted
      expose! :description
      expose! :conditions
      expose! :requirements
      expose! :wellplates,                          using: 'Entities::WellplateEntity'
      expose! :comment_count
    end

    with_options(anonymize_below: 10) do
      expose! :collaborator
      expose! :result
      expose! :code_log,              anonymize_with: nil, using: 'Entities::CodeLogEntity'
      expose! :container,             anonymize_with: nil, using: 'Entities::ContainerEntity'
      expose! :research_plans,        anonymize_with: [],  using: 'Entities::ResearchPlanEntity'
      expose! :component_graph_data,  anonymize_with: {}
      expose! :segments,              anonymize_with: [],  using: 'Labimotion::SegmentEntity'
      expose! :tag,                   anonymize_with: nil, using: 'Entities::ElementTagEntity'
    end
    # rubocop:enable Layout/ExtraSpacing

    expose_timestamps

    private

    def code_log
      displayed_in_list? ? nil : object.code_log
    end

    def container
      displayed_in_list? ? nil : object.container
    end

    def is_restricted # rubocop:disable Naming/PredicateName
      detail_levels[Screen] < 10
    end

    def research_plans
      displayed_in_list? ? [] : object.research_plans
    end

    def segments
      displayed_in_list? ? [] : object.segments
    end

    def type
      'screen'
    end

    def wellplates
      displayed_in_list? ? [] : object.wellplates
    end

    def comment_count
      object.comments.count
    end
  end
end
