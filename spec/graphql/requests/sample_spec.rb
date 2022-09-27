# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Sample', type: :request do
  subject { response.body }

  include_context 'request authorization context'

  before do
    create(:valid_sample)

    post '/graphql', params: { query: query, variables: variables }, headers: authorization_header
  end

  let(:obj) { Sample.last }

  let(:variables) { { id: obj.id } }
  let(:query) do
    "
      query sample($id: ID!) {
        sample(id: $id) {
          molecule {
            names
            canoSmiles
          }
          boilingPoint
          description
          externalLabel
          id
        }
      }
    "
  end
  let(:expected_response) do
    {
      data: {
        sample: {
          molecule: {
            names: %w[
              name1
              sum_formular
              iupac_name
            ],
            canoSmiles: obj.molecule.cano_smiles
          },
          boilingPoint: '-Infinity...Infinity',
          description: obj.description,
          externalLabel: obj.external_label,
          id: obj.id
        }
      }
    }.to_json
  end

  it { is_expected.to eq(expected_response) }
end
