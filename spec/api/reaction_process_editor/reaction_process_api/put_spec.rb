# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessAPI, '.put' do
  include RequestSpecHelper

  subject(:api_call) do
    put("/api/v1/reaction_process_editor/reaction_processes/#{reaction_process.id}",
        headers: authorization_header,
        params: { reaction_process_vessel: reaction_process_vessel_params }.to_json)
  end

  let(:reaction_process) { create(:reaction_process) }
  let(:vessel) { create(:vessel) }
  let(:reaction_process_vessel_params) do
    { vesselable_id: vessel.id, vesselable_type: 'Vessel', preparations: ['DRIED'] }
  end
  let(:authorization_header) { authorized_header(reaction_process.creator) }

  it 'assigns reaction process vessel' do
    expect { api_call }.to change { reaction_process.reload.reaction_process_vessel_id }.from(nil)
  end

  it 'responds with created' do
    api_call
    expect(response).to have_http_status(:created)
  end
end
