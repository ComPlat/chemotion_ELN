# frozen_string_literal: true

module Entities
  class ResearchPlanEntity < ApplicationEntity
    expose(
      :id,
      :type,
      :name,
      :body,
      :thumb_svg,
    )
    expose :container, using: 'Entities::ContainerEntity'
    expose :research_plan_metadata, using: 'Entities::ResearchPlanMetadataEntity'
    expose :segments, using: 'Entities::SegmentEntity'
    expose :tag, using: 'Entities::ElementTagEntity'
    expose :wellplates, using: 'Entities::WellplateEntity'

    expose_timestamps

    private

    def container
      displayed_in_list? ? nil : object.container
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
