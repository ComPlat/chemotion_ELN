# frozen_string_literal: true

module Clap
  module Exporter
    module Models
      class StepAutomationControlExporter
        def initialize(automation_control)
          @automation_control = automation_control
        end

        def to_clap
          return unless automation_control && automation_control['status']

          { step_status: step_status,
            depends_on_action_id: automation_control['depends_on_action_id'],
            depends_on_step_id: automation_control['depends_on_step_id'] }
        end

        private

        attr_reader :automation_control

        def step_status
          Clap::AutomationControl::StepAutomationStatus.const_get(automation_control['status'].to_s)
        rescue NameError
          Clap::AutomationControl::StepAutomationStatus::STEP_AUTOMATION_STATUS_UNSPECIFIED
        end
      end
    end
  end
end
