# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessAPI, '.get' do
  include RequestSpecHelper
  subject(:api_call) do
    get("/api/v1/reaction_process_editor/reaction_processes/#{reaction_process.id}",
        headers: authorization_header)
  end

  let!(:reaction_process) { create(:reaction_process) }

  let(:expected_process_hash) do
    { id: reaction_process.id,
      short_label: reaction_process.short_label,
      provenance: hash_including({ email: String }.deep_stringify_keys),
      reaction_default_conditions: { 'reaction_process_id' => reaction_process.id },
      reaction_process_steps: [],
      samples_preparations: [],
      user_default_conditions: Hash,
      select_options: Hash }.deep_stringify_keys
  end

  let(:authorization_header) { authorized_header(reaction_process.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'returns reaction_process hash' do
    api_call
    expect(parsed_json_response['reaction_process']).to include expected_process_hash
  end
end
