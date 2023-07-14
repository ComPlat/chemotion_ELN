# frozen_string_literal: true

module Entities
  class ResearchPlanEntity < ApplicationEntity
    # rubocop:disable Layout/ExtraSpacing
    with_options(anonymize_below: 0) do
      expose! :body
      expose! :container,                                    using: 'Entities::ContainerEntity'
      expose! :id
      expose! :is_restricted
      expose! :name
      expose! :thumb_svg
      expose! :type
      expose! :comment_count
      expose! :can_update,      unless: :displayed_in_list
    end

    with_options(anonymize_below: 10) do
      expose! :attachment_count
      expose! :research_plan_metadata,  anonymize_with: nil, using: 'Entities::ResearchPlanMetadataEntity'
      expose! :tag,                     anonymize_with: nil, using: 'Entities::ElementTagEntity'
      expose! :wellplates,              anonymize_with: [],  using: 'Entities::WellplateEntity'
      expose! :segments,                anonymize_with: [],  using: 'Entities::SegmentEntity'
    end
    # rubocop:enable Layout/ExtraSpacing

    expose_timestamps

    private

    def attachment_count
      object.attachments.size
    end

    def container
      displayed_in_list? ? nil : object.container
    end

    def is_restricted # rubocop:disable Naming/PredicateName
      detail_levels[ResearchPlan] < 10
    end

    def segments
      displayed_in_list? ? [] : object.segments
    end

    def type
      'research_plan'
    end

    def wellplates
      displayed_in_list? ? [] : object.wellplates
    end

    def comment_count
      object.comments.count
    end

    def can_update
      options[:policy].try(:update?) || false
    end
  end
end
