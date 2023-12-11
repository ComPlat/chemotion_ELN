# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::EditorAPI, '.get /collection_select_options' do
  include RequestSpecHelper

  subject(:api_call) do
    get('/api/v1/reaction_process_editor/collection_select_options',
        headers: authorization_header)
  end

  let!(:creator) { create(:person) }
  let!(:collections) { create_list(:collection, 3, user_id: creator.id) }

  let(:expected_collection_options) do
    [hash_including({ label: 'All' }.stringify_keys),
     hash_including({ label: 'chemotion-repository.net' }.stringify_keys),
     hash_including({ value: collections[0].id }.stringify_keys),
     hash_including({ value: collections[1].id }.stringify_keys),
     hash_including({ value: collections[2].id }.stringify_keys)]
  end

  let(:authorization_header) { authorized_header(creator) }

  it_behaves_like 'authenticated API call'

  it 'responds 200' do
    api_call
    expect(response).to have_http_status :ok
  end

  it 'returns reaction_process hash' do
    api_call
    expect(parsed_json_response).to include({ collection_select_options: expected_collection_options }.stringify_keys)
  end
end
