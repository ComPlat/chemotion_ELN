# frozen_string_literal: true

module Entities
  class DevicesAnalysisEntity < ApplicationEntity
    expose(
      :analysis_type,
      :device_id,
      :id,
      :title,
    )

    expose :experiments, using: Entities::AnalysesExperimentEntity

    def title
      device_title = object.device&.title || object.device_id

      "#{device_title}: #{object.analysis_type}"
    end

    def experiments
      object.analyses_experiments
    end
  end
end
