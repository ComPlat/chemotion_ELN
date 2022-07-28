# frozen_string_literal: true

module Entities
  class ResearchPlanTableSchemaEntity < ApplicationEntity
    expose(
      :id,
      :name,
      :value,
    )
    expose :creator, using: 'Entities::UserSimpleEntity'

    expose_timestamps
  end
end
