# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Collection', type: :request do
  subject { response.body }

  include_context 'request authorization context'

  before do
    create(:collection)

    post '/graphql', params: { query: query, variables: variables }, headers: authorization_header
  end

  let(:obj) { Collection.last }

  let(:variables) { { id: obj.id } }
  let(:query) do
    "
      query collection($id: ID!) {
        collection(id: $id) {
          id
          label
          permissionLevel
        }
      }
    "
  end
  let(:expected_response) do
    {
      data: {
        collection: {
          id: obj.id,
          label: obj.label,
          permissionLevel: obj.permission_level
        }
      }
    }.to_json
  end

  it { is_expected.to eq(expected_response) }
end
