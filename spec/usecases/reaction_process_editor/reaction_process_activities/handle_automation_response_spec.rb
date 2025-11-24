# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessActivities::HandleAutomationResponse do
  subject(:handle_automation_response) do
    described_class.execute!(activity: activity, response_json: upload_file)
  end

  let(:upload_file) { fixture_file_upload('files/reaction_process_editor/automation_responses/hs-15-2-plates-response.json') }

  let(:expected_automation_response) do
    { vialPlates: [
      { trayType: 'HS_15',
        trayColumns: 5,
        trayRows: 3,
        vials: [11_568, 9646, nil, 16_165, 56_161, 619_619, nil, 1196, nil, 196, nil, nil, nil, nil,
                956_191] }.deep_stringify_keys,
      { trayType: 'HS_15',
        trayColumns: 5,
        trayRows: 3,
        vials: [949_456, nil, 1616, 15_616, 616, nil, nil, nil, 1619, 6_511_960, 5196, 15_198, 1598, 964_949,
                65_196] }.deep_stringify_keys,
    ] }.deep_stringify_keys
  end

  let(:activity) { create(:reaction_process_activity) }

  it 'updates field automation_response from JSON' do
    expect { handle_automation_response }.to change(activity, :automation_response).to(expected_automation_response)
  end

  it "updates workup['automation_status']" do
    expect { handle_automation_response }.to change { activity.workup['AUTOMATION_STATUS'] }.to('AUTOMATION_RESPONDED')
  end
end
