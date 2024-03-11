# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessVesselAPI, '.put' do
  include RequestSpecHelper

  subject(:api_call) do
    put("/api/v1/reaction_process_editor/reaction_process_vessels/#{reaction_process_vessel.id}",
        params: update_params.to_json,
        headers: authorization_header)
  end

  let!(:reaction_process_vessel) { create(:reaction_process_vessel) }
  let!(:new_preparations) { ['dried'] }
  let(:update_params) do
    { reaction_process_vessel:
      { preparations: new_preparations } }
  end

  let(:expected_response_hash) do
    { 'reaction_process_vessel' => hash_including(
      {
        preparations: new_preparations,
      }.deep_stringify_keys,
    ) }
  end

  let(:authorization_header) { authorized_header(reaction_process_vessel.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'updates ReactionProcessVessel' do
    expect { api_call }.to change {
      reaction_process_vessel.reload.preparations
    }.to(new_preparations)
  end

  it 'returns reaction_process_vessel' do
    api_call
    expect(parsed_json_response).to include(expected_response_hash)
  end
end
