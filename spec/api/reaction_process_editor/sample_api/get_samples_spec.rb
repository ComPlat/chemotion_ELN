# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::SampleAPI, '.get /samples' do
  include RequestSpecHelper

  subject(:api_call) do
    get('/api/v1/reaction_process_editor/samples',
        headers: authorization_header)
  end

  let(:user) { create(:person) }
  let(:authorization_header) { authorized_header(user) }
  let(:collection) { create(:collection, user: user) }
  let(:sample) { create(:valid_sample) }

  before do
    CollectionsSample.create!(collection: collection, sample: sample)
  end

  it 'returns samples from readable collections' do
    api_call

    expect(parsed_json_response['samples'].pluck('id')).to include(sample.id)
  end
end
