# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessActivityAPI, '.delete' do
  include RequestSpecHelper

  subject(:delete_activity_request) do
    delete("/api/v1/reaction_process_editor/reaction_process_activities/#{activity.id}",
           headers: authorization_header)
  end

  let!(:activity) { create(:reaction_process_activity) }

  let(:authorization_header) { authorized_header(activity.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'destroys action' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessActivities::Destroy).to receive(:execute!)
    delete_activity_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessActivities::Destroy)
      .to have_received(:execute!).with(activity: activity)
  end
end
