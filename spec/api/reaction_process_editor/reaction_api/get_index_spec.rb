# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionAPI, '.get /index' do
  include RequestSpecHelper

  subject(:api_call) do
    get('/api/v1/reaction_process_editor/reactions',
        params: { collection_id: collection_id },
        headers: authorization_header)
  end

  let!(:creator) { create_default(:person) }
  let!(:collection) { create(:collection, user_id: creator.id) }

  let!(:reaction_processes) { create_list(:reaction_process, 2, :in_collection) }
  let!(:collections_reaction_processes) { create_list(:reaction_process, 3, :in_collection, collection: collection) }

  let(:authorization_header) { authorized_header(creator) }

  let(:collection_id) { nil }

  before do
    api_call
  end

  it_behaves_like 'authenticated API call'

  it 'responds 200' do
    expect(response).to have_http_status :ok
  end

  it 'returns reactions (5)' do
    expect(parsed_json_response['reactions'].size).to eq 5
  end

  it 'returns all reactions' do
    expect(parsed_json_response['reactions']).to include(
      hash_including({ id: reaction_processes[0].reaction_id }.stringify_keys),
      hash_including({ id: reaction_processes[1].reaction_id }.stringify_keys),
      hash_including({ id: collections_reaction_processes[0].reaction_id }.stringify_keys),
      hash_including({ id: collections_reaction_processes[1].reaction_id }.stringify_keys),
      hash_including({ id: collections_reaction_processes[2].reaction_id }.stringify_keys),
    )
  end

  context 'with collection filter' do
    let(:collection_id) { collection.id }

    it 'returns (3) filtered reactions' do
      expect(parsed_json_response['reactions'].size).to eq 3
    end

    it 'returns filtered reactions data' do
      expect(parsed_json_response['reactions']).to include(
        hash_including({ id: collections_reaction_processes[0].reaction_id }.stringify_keys),
        hash_including({ id: collections_reaction_processes[1].reaction_id }.stringify_keys),
        hash_including({ id: collections_reaction_processes[2].reaction_id }.stringify_keys),
      )
    end
  end

  context 'with nonexistant collection filter' do
    let(:collection_id) { 'nonexistant' }

    it 'returns []' do
      expect(parsed_json_response['reactions']).to eq []
    end
  end
end
