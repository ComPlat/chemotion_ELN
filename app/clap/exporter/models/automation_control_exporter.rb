# frozen_string_literal: true

module Clap
  module Exporter
    module Models
      class AutomationControlExporter
        def initialize(automation_control)
          @automation_control = automation_control
        end

        def to_clap
          return status_can_run unless automation_control

          { status: status,
            depends_on_action_id: automation_control['depends_on_action_id'],
            depends_on_step_id: automation_control['depends_on_step_id'] }
        end

        private

        attr_reader :automation_control

        def status_can_run
          { status: Clap::AutomationControl::AutomationStatus::CAN_RUN }
        end

        def status
          Clap::AutomationControl::AutomationStatus.const_get(automation_control['status'].to_s)
        rescue NameError
          Clap::AutomationControl::AutomationStatus::AUTOMATION_STATUS_UNSPECIFIED
        end
      end
    end
  end
end
