# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::OntologiesAPI, '.post /ontologies' do
  include RequestSpecHelper

  subject(:api_call) do
    post('/api/v1/reaction_process_editor/ontologies',
         headers: authorization_header,
         params: { ontology: ontology_params }.to_json)
  end

  let(:user) { create(:person) }
  let(:authorization_header) { authorized_header(user) }
  let(:ontology_params) do
    {
      active: true,
      ontology_id: 'CHMO:posted',
      ontology_type: 'device',
      label: 'Posted Ontology',
      roles: {},
    }
  end

  it 'creates an ontology' do
    expect { api_call }.to change(ReactionProcessEditor::Ontology, :count).by(1)
  end

  context 'with existing Ontology (by ontology_id)' do
    let!(:ontology) { create(:ontology, ontology_id: 'CHMO:posted', label: 'Existing Ontology') }

    it 'retains ontology' do
      expect { api_call }.not_to change(ReactionProcessEditor::Ontology, :count)
    end

    it 'updates existing ontology' do
      expect { api_call }.to change { ontology.reload.label }.to('Posted Ontology')
    end
  end
end
