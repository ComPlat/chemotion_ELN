# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessActivities
      class HandleAutomationResponse
        def self.execute!(activity:, response_json:)
          ActiveRecord::Base.transaction do
            activity.automation_response = JSON.parse(response_json.read)

            activity.workup['automation_control'] = { status: 'AUTOMATION_RESPONDED' }
            activity.save
          end
        end
      end
    end
  end
end
