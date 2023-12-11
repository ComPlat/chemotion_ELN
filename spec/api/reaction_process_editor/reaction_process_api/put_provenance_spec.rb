# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessAPI, '.put /provenance' do
  include RequestSpecHelper

  subject(:api_call) do
    put("/api/v1/reaction_process_editor/reaction_processes/#{reaction_process.id}/provenance",
        headers: authorization_header,
        params: { provenance: provenance_params }.to_json)
  end

  # params: { vessel_id: vessel_id }.to_json,

  let!(:reaction_process) { create_default(:reaction_process, :has_provenance) }

  let(:provenance_params) do
    { email: 'testuser@example.com',
      doi: 'Updated doi' }.deep_stringify_keys
  end

  let(:authorization_header) { authorized_header(reaction_process.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'updates provenance' do
    expect { api_call }.to change { reaction_process.reload.provenance.attributes }
      .to(
        hash_including(provenance_params),
      )
  end
end
