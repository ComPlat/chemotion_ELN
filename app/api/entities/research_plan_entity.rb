# frozen_string_literal: true

module Entities
  class ResearchPlanEntity < ApplicationEntity
    # ResearchPlan does not have any anonymization defined, so nothing to see here
    expose :body
    expose :container,              using: 'Entities::ContainerEntity'
    expose :id
    expose :is_restricted
    expose :name
    expose :research_plan_metadata, using: 'Entities::ResearchPlanMetadataEntity'
    expose :segments,               using: 'Entities::SegmentEntity'
    expose :tag,                    using: 'Entities::ElementTagEntity'
    expose :thumb_svg
    expose :type
    expose :wellplates,             using: 'Entities::WellplateEntity'

    expose_timestamps

    private

    def container
      displayed_in_list? ? nil : object.container
    end

    def is_restricted
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
  end
end
