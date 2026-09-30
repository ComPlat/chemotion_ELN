# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Models::StepAutomationControlExporter do
  subject(:automation_export) { described_class.new(workup).to_clap }

  let(:workup) { { 'status' => 'STEP_COMPLETED' } }

  it 'exports step automation status' do
    expect(automation_export).to eq(
      step_status: Clap::AutomationControl::StepAutomationStatus::STEP_COMPLETED,
      depends_on_action_id: nil,
      depends_on_step_id: nil,
    )
  end

  context 'without step automation status' do
    let(:workup) { {} }

    it 'exports step_status nil' do
      expect(automation_export).to be_nil
    end
  end

  context 'with a unknown step status' do
    let(:workup) { { 'status' => 'bad' } }

    it 'exports step status :STEP_AUTOMATION_STATUS_UNSPECIFIED' do
      expect(automation_export[:step_status]).to eq(
        Clap::AutomationControl::StepAutomationStatus::STEP_AUTOMATION_STATUS_UNSPECIFIED,
      )
    end
  end
end
