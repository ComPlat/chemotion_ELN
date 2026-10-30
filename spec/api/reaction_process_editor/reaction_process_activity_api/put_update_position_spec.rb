# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessActivityAPI, '.put /update_position' do
  include RequestSpecHelper

  subject(:put_activity_request) do
    put("/api/v1/reaction_process_editor/reaction_process_activities/#{activity.id}/update_position",
        params: { position: position }.to_json,
        headers: authorization_header)
  end

  let(:activity) { create(:reaction_process_activity) }
  let(:position) { 2 }

  let(:authorization_header) { authorized_header(activity.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'updates position' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessActivities::UpdatePosition).to receive(:execute!)

    put_activity_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessActivities::UpdatePosition).to have_received(:execute!).with(
      activity: activity, position: position,
    )
  end
end
