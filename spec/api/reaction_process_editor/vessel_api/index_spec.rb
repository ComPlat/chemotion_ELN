# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::VesselAPI, '.index' do
  include RequestSpecHelper

  subject(:vessel_index_request) do
    get('/api/v1/reaction_process_editor/vessels',
        headers: authorization_header)
  end

  let!(:logged_in_user) { create_default(:person) }
  let!(:vessels) { create_list(:vessel, 5) }

  let!(:authorization_header) { authorized_header(logged_in_user) }

  it_behaves_like 'authenticated API call'

  it 'returns vessels' do
    vessel_index_request
    expect(parsed_json_response).to include({ vessels:
      [
        hash_including({ id: vessels[0].id }.deep_stringify_keys),
        hash_including({ id: vessels[1].id  }.deep_stringify_keys),
        hash_including({ id: vessels[2].id  }.deep_stringify_keys),
        hash_including({ id: vessels[3].id  }.deep_stringify_keys),
        hash_including({ id: vessels[4].id  }.deep_stringify_keys),
      ] }.deep_stringify_keys)
  end
end
