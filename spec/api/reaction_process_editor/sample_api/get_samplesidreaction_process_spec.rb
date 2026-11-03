# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::SampleAPI, '.get /samples/:id/reaction_process' do
  include RequestSpecHelper

  subject(:api_call) do
    get("/api/v1/reaction_process_editor/samples/#{sample_id}/reaction_process",
        headers: authorization_header)
  end

  let(:user) { create(:person) }
  let(:sample) { create(:valid_sample) }
  let(:sample_id) { sample.id }
  let(:authorization_header) { authorized_header(user) }

  let(:element_policy) { instance_double(ElementPolicy) }

  before do
    allow(ElementPolicy).to receive(:new).and_return(element_policy)
    allow(element_policy).to receive(:read?).and_return(true)
  end

  it 'returns the sample reaction process' do
    api_call
    expect(parsed_json_response.dig('reaction_process', 'sample', 'id')).to eq(sample.id)
  end

  context 'when sample is missing' do
    let(:sample_id) { 'missing' }

    it 'responds with not found' do
      api_call
      expect(response).to have_http_status(:not_found)
    end
  end
end
