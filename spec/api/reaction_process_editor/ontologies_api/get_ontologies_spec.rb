# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::OntologiesAPI, '.get /ontologies' do
  include RequestSpecHelper

  subject(:api_call) do
    get('/api/v1/reaction_process_editor/ontologies',
        headers: authorization_header)
  end

  let(:user) { create(:person) }
  let(:authorization_header) { authorized_header(user) }
  let(:later_ontology) { create(:ontology, ontology_id: 'CHMO:2', label: 'Later') }
  let(:earlier_ontology) { create(:ontology, ontology_id: 'CHMO:1', label: 'Earlier') }

  before do
    later_ontology
    earlier_ontology
  end

  it 'returns ontologies ordered by ontology_id' do
    api_call

    expect(parsed_json_response['ontologies'].pluck('id')).to eq([earlier_ontology.id, later_ontology.id])
  end
end
