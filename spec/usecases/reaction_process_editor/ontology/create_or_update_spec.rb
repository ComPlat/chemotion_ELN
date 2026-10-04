# frozen_string_literal: true

require 'rails_helper'

describe Usecases::ReactionProcessEditor::Ontology::CreateOrUpdate do
  describe '.execute!' do
    subject(:execute) { described_class.execute!(ontology_params: ontology_params) }

    let(:ontology_params) do
      {
        ontology_id: 'CHMO:0000003',
        label: 'Initial label',
        ontology_type: 'device',
        roles: {},
        active: true,
      }
    end

    it 'creates an ontology' do
      expect { execute }.to change(ReactionProcessEditor::Ontology, :count).by(1)
    end

    it 'updates an existing ontology' do
      ReactionProcessEditor::Ontology.create!(ontology_params.merge(label: 'Old label'))

      execute

      expect(ReactionProcessEditor::Ontology.find_by(ontology_id: 'CHMO:0000003').label).to eq('Initial label')
    end
  end
end
