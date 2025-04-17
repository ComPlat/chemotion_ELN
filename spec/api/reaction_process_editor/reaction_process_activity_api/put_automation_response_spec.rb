# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessActivityAPI, '.put /automation_response' do
  include RequestSpecHelper

  subject(:put_activity_request) do
    put("/api/v1/reaction_process_editor/reaction_process_activities/#{activity.id}/automation_response",
        params: { response_json: response_file },
        headers: authorization_header)
  end

  let(:api_user) { create(:user, type: 'ReactionProcessEditor::ApiUser') }

  let(:activity) { create(:reaction_process_activity) }
  let(:response_file) do
    fixture_file_upload('reaction_process_editor/automation_responses/hs-15-2-plates-response.json')
  end

  let(:authorization_header) { authorized_header(api_user) }

  it_behaves_like 'authorization restricted API call'

  it 'executes HandleAutomationResponse' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessActivities::HandleAutomationResponse)
      .to receive(:execute!)

    put_activity_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessActivities::HandleAutomationResponse)
      .to have_received(:execute!)
      .with(activity: activity, response_json: an_instance_of(Tempfile))
  end
end
