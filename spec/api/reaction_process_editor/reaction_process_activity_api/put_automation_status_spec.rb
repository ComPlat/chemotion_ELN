# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessActivityAPI, '.put /automation_status' do
  include RequestSpecHelper

  subject(:put_activity_request) do
    put("/api/v1/reaction_process_editor/reaction_process_activities/#{activity.id}/automation_status",
        params: { status: 'the_automation_status' }.to_json,
        headers: authorization_header)
  end

  let(:api_user) { create(:user, type: 'ReactionProcessEditor::ApiUser') }
  let(:activity) { create(:reaction_process_activity) }
  let(:authorization_header) { authorized_header(api_user) }

  it_behaves_like 'authorization restricted API call'

  it 'executes HandleAutomationStatus' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessActivities::HandleAutomationStatus)
      .to receive(:execute!)

    put_activity_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessActivities::HandleAutomationStatus)
      .to have_received(:execute!)
      .with(activity: activity, automation_status: 'the_automation_status')
  end
end
