# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionAPI, '.get /reaction_process' do
  include RequestSpecHelper

  subject(:get_reaction_process_request) do
    get("/api/v1/reaction_process_editor/reactions/#{reaction_id}/reaction_process",
        headers: authorization_header)
  end

  let!(:reaction) { create(:valid_reaction) }
  let!(:reaction_id) { reaction.id }
  let(:reaction_process) { reaction.reload.reaction_process }

  let(:expected_process_hash) do
    { short_label: reaction_process.short_label,
      provenance: hash_including({ email: String }.deep_stringify_keys),
      reaction_default_conditions: { 'reaction_process_id' => reaction_process.id },
      reaction_process_steps: [],
      samples_preparations: [],
      user_reaction_default_conditions: Hash,
      select_options: Hash }.deep_stringify_keys
  end

  let(:authorization_header) { authorized_header(reaction.creator) }

  it_behaves_like 'authorization restricted API call'

  context 'when authorized' do
    it 'responds 200' do
      get_reaction_process_request
      expect(response).to have_http_status :ok
    end

    it 'returns reaction_process hash' do
      get_reaction_process_request
      expect(parsed_json_response['reaction_process']).to include expected_process_hash
    end

    it 'triggers UseCase ReactionProcess::FindOrCreate' do
      allow(Usecases::ReactionProcessEditor::ReactionProcesses::FindOrCreateByReaction).to receive(:execute!)
      get_reaction_process_request

      expect(Usecases::ReactionProcessEditor::ReactionProcesses::FindOrCreateByReaction).to have_received(:execute!)
        .with(
          reaction: reaction,
          current_user: reaction.creator,
        )
    end
  end

  context 'when reaction missing' do
    let(:reaction_id) { 'nonexistant' }

    it 'responds 404' do
      get_reaction_process_request
      expect(response).to have_http_status :not_found
    end
  end
end
