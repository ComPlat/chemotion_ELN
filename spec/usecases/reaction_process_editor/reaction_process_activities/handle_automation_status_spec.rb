# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessActivities::HandleAutomationStatus do
  subject(:handle_automation_status) do
    described_class.execute!(activity: activity, automation_status: automation_status)
  end

  let(:automation_status) { 'COMPLETED' }

  let!(:activity) { create(:reaction_process_activity) }

  it "updates workup['automation_control']" do
    expect { handle_automation_status }.to change {
      activity.workup.dig('automation_control', 'status')
    }.to('COMPLETED')
  end

  context 'with disallowed status' do
    let(:automation_status) { 'OTHER_THAN_COMPLETED' }

    it "retains workup['automation_control']" do
      expect { handle_automation_status }.not_to(change { activity.workup['automation_control'] })
    end
  end
end
