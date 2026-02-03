# frozen_string_literal: true

module OrdKit
  module Exporter
    module Models
      class AutomationControlExporter
        def initialize(automation_control)
          @automation_control = automation_control
        end

        def to_ord
          return unless @automation_control && @automation_control['status']

          { status: status,
            step_status: step_status,
            depends_on_action_id: @automation_control['depends_on_action_id'],
            depends_on_step_id: @automation_control['depends_on_step_id'] }
        end

        private

        def status
          OrdKit::AutomationControl::AutomationStatus.const_get(@automation_control['status'].to_s)
        rescue NameError
          OrdKit::AutomationControl::AutomationStatus::AUTOMATION_STATUS_UNSPECIFIED
        end

        def step_status
          OrdKit::AutomationControl::StepAutomationStatus.const_get(@automation_control['status'].to_s)
        rescue NameError
          OrdKit::AutomationControl::StepAutomationStatus::STEP_AUTOMATION_STATUS_UNSPECIFIED
        end

        def ontology
          ReactionProcessEditor::Ontology.find_by(ontology_id: @ontology_id)
        end
      end
    end
  end
end
