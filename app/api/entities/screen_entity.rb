# frozen_string_literal: true

module Entities
  class ScreenEntity < ApplicationEntity
    expose(
      :collaborator,
      :conditions,
      :description,
      :id,
      :name,
      :requirements,
      :result,
      :type,
    )

    expose_timestamps

    expose :code_log, using: 'Entities::CodeLogEntity'
    expose :container, using: 'Entities::ContainerEntity'
    expose :research_plans, using: 'Entities::ResearchPlanEntity'
    expose :segments, using: 'Entities::SegmentEntity'
    expose :tag, using: 'Entities::ElementTagEntity'
    expose :wellplates, using: 'Entities::WellplateEntity'

    private

    def container
      displayed_in_list? ? nil : object.container
    end

    def code_log
      displayed_in_list? ? nil : object.code_log
    end

    def research_plans
      displayed_in_list? ? [] : object.research_plans
    end

    def segments
      displayed_in_list? ? [] : object.segments
    end

    def wellplates
      displayed_in_list? ? [] : object.wellplates
    end

    def type
      'screen'
    end
  end
end
