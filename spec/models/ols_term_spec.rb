# frozen_string_literal: true

require 'rails_helper'

RSpec.describe OlsTerm do
  describe '.import_and_create_ols_from_file_path' do
    before do
      described_class.import_and_create_ols_from_file_path('bao', Rails.root.join('spec/fixtures/ontologies/bao.owl'))
    end

    it 'imports labelled, non-deprecated BAO classes identified by their fragment IRIs' do
      expect(described_class.where(owl_name: 'bao').pluck(:term_id))
        .to contain_exactly('BAO:0002753', 'BAO:0000001', 'BAO:0000002')
    end

    it 'preserves definitions, synonyms and version metadata' do
      term = described_class.find_by!(owl_name: 'bao', term_id: 'BAO:0002753')
      expect(term.desc).to eq('A method component of an assay.')
      expect(term.synonyms).to eq(['method component'])
      expect(term.metadata.dig('version', 'versionInfo')).to eq('test fixture')
    end

    it 'builds the hierarchy through named parents, skipping OWL restrictions' do
      term = described_class.find_by!(owl_name: 'bao', term_id: 'BAO:0000002')
      expect(term.ancestors.pluck(:term_id)).to eq(['BAO:0002753', 'BAO:0000001'])
      expect(term.synonyms).to be_nil
    end
  end

  describe '.create_from_owl_nodes' do
    it 'continues importing CHMO identifiers and OBO parent IRIs' do
      nodes = [
        { 'id' => 'CHMO:0000001', 'label' => 'parent', 'hasExactSynonym' => 'synonym' },
        { 'id' => 'CHMO:0000002', 'label' => 'child',
          'subClassOf' => { 'rdf:resource' => 'http://purl.obolibrary.org/obo/CHMO_0000001' } },
      ]
      described_class.create_from_owl_nodes(nodes, 'chmo')
      described_class.rebuilt_ancestry_by_owl_name('chmo')

      term = described_class.find_by!(owl_name: 'chmo', term_id: 'CHMO:0000002')
      expect(term.parent.term_id).to eq('CHMO:0000001')
      expect(term.synonyms).to be_nil
    end
  end
end
