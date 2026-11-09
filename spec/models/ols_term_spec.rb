# frozen_string_literal: true

# == Schema Information
#
# Table name: ols_terms
#
#  id               :integer          not null, primary key
#  ancestry         :string           default("/"), not null
#  desc             :string
#  is_enabled       :boolean          default(TRUE)
#  label            :string
#  metadata         :jsonb
#  owl_name         :string
#  synonym          :string
#  synonyms         :jsonb
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  ancestry_term_id :string
#  term_id          :string
#
# Indexes
#
#  index_ols_terms_on_ancestry              (ancestry)
#  index_ols_terms_on_owl_name_and_term_id  (owl_name,term_id) UNIQUE
#
require 'rails_helper'

RSpec.describe OlsTerm do
  let(:owl_name) { 'chmo' }

  def create_term(term_id, parent: nil)
    described_class.create!(owl_name: owl_name, term_id: term_id, ancestry_term_id: parent)
  end

  def term(term_id)
    described_class.find_by(owl_name: owl_name, term_id: term_id)
  end

  describe '.rebuilt_ancestry_by_owl_name' do
    it 'builds the ancestry when parents come before their children' do
      root = create_term('CHMO:3')
      parent = create_term('CHMO:1', parent: 'CHMO:3')
      create_term('CHMO:2', parent: 'CHMO:1')

      described_class.rebuilt_ancestry_by_owl_name(owl_name)

      expect(term('CHMO:2').ancestry).to eq "/#{root.id}/#{parent.id}/"
    end

    it 'builds a valid ancestry when a child comes before its parent' do
      child = create_term('CHMO:2', parent: 'CHMO:1')
      parent = create_term('CHMO:1', parent: 'CHMO:3')
      root = create_term('CHMO:3')

      described_class.rebuilt_ancestry_by_owl_name(owl_name)

      expect(term('CHMO:2').ancestry).to eq "/#{root.id}/#{parent.id}/"
      expect(term('CHMO:2')).to be_valid
      expect(parent.reload.descendants).to contain_exactly(child)
    end

    it 'builds a valid ancestry for a deeper chain in reverse order' do
      terms = %w[CHMO:4 CHMO:3 CHMO:2].each_with_index.map { |id, i| create_term(id, parent: "CHMO:#{3 - i}") }
      root = create_term('CHMO:1')

      described_class.rebuilt_ancestry_by_owl_name(owl_name)

      expected = [root, *terms.reverse].map(&:id)
      expect(term('CHMO:4').ancestry).to eq "/#{expected[0..2].join('/')}/"
      expect(term('CHMO:4')).to be_valid
      expect(root.reload.descendants.count).to eq 3
    end

    it 'builds the full path of a chain deeper than ten levels in reverse order' do
      12.downto(2) { |i| create_term("CHMO:#{i}", parent: "CHMO:#{i - 1}") }
      root = create_term('CHMO:1')

      described_class.rebuilt_ancestry_by_owl_name(owl_name)

      expected = (1..11).map { |i| term("CHMO:#{i}").id }
      expect(term('CHMO:12').ancestry).to eq "/#{expected.join('/')}/"
      expect(root.reload.descendants.count).to eq 11
    end

    it 'makes a term whose parent is not in the ontology a root' do
      create_term('CHMO:2', parent: 'BFO:404')

      described_class.rebuilt_ancestry_by_owl_name(owl_name)

      expect(term('CHMO:2').ancestry).to eq '/'
    end

    it 'terminates on a cycle and leaves its terms as roots' do
      create_term('CHMO:1', parent: 'CHMO:2')
      create_term('CHMO:2', parent: 'CHMO:1')

      described_class.rebuilt_ancestry_by_owl_name(owl_name)

      expect(described_class.pluck(:ancestry)).to all(eq '/')
    end

    it 'changes nothing on a second run' do
      create_term('CHMO:2', parent: 'CHMO:1')
      create_term('CHMO:1')

      expect(described_class.rebuilt_ancestry_by_owl_name(owl_name)).to eq 1
      expect(described_class.rebuilt_ancestry_by_owl_name(owl_name)).to eq 0
    end
  end

  describe '.import_owl' do
    let(:owl) do
      Tempfile.new(['chmo', '.owl']).tap do |file|
        file.write(<<~XML)
          <?xml version="1.0"?>
          <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                   xmlns:owl="http://www.w3.org/2002/07/owl#"
                   xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                   xmlns:oboInOwl="http://www.geneontology.org/formats/oboInOwl#"
                   xmlns:obo="http://purl.obolibrary.org/obo/">
            <owl:Ontology rdf:about="http://purl.obolibrary.org/obo/chmo.owl"/>
            <owl:Class rdf:about="http://purl.obolibrary.org/obo/OBI_0000094">
              <obo:IAO_0100001 rdf:resource="http://purl.obolibrary.org/obo/COB_0000110"/>
              <rdfs:label>obsolete material processing</rdfs:label>
              <owl:deprecated rdf:datatype="http://www.w3.org/2001/XMLSchema#boolean">true</owl:deprecated>
            </owl:Class>
            <owl:Class rdf:about="http://purl.obolibrary.org/obo/COB_0000110">
              <rdfs:label>material processing</rdfs:label>
            </owl:Class>
            <owl:Class rdf:about="http://purl.obolibrary.org/obo/CHMO_0002196">
              <rdfs:subClassOf rdf:resource="http://purl.obolibrary.org/obo/OBI_0000094"/>
              <oboInOwl:id>CHMO:0002196</oboInOwl:id>
              <rdfs:label>activation</rdfs:label>
            </owl:Class>
            <owl:Class rdf:about="http://purl.obolibrary.org/obo/BFO_0000002">
              <rdfs:label>continuant</rdfs:label>
            </owl:Class>
            <owl:Class rdf:about="http://purl.obolibrary.org/obo/CHMO_0000953">
              <rdfs:subClassOf rdf:resource="http://purl.obolibrary.org/obo/BFO_0000002"/>
              <oboInOwl:id>CHMO:0000953</oboInOwl:id>
              <rdfs:label>microscope</rdfs:label>
            </owl:Class>
            <owl:Class rdf:about="http://purl.obolibrary.org/obo/CHMO_0000001">
              <oboInOwl:id>CHMO:0000001</oboInOwl:id>
              <rdfs:label>colorimetry</rdfs:label>
            </owl:Class>
            <owl:Class rdf:about="http://purl.obolibrary.org/obo/CHMO_0002934">
              <rdfs:label>open circuit voltage</rdfs:label>
            </owl:Class>
            <owl:Class rdf:about="http://purl.obolibrary.org/obo/CHMO_0002937">
              <oboInOwl:id>CHMO:0002934</oboInOwl:id>
              <rdfs:label>potentiostatic electrochemical impedance spectroscopy</rdfs:label>
            </owl:Class>
            <owl:Class rdf:about="http://purl.obolibrary.org/obo/CHMO_0000001">
              <rdfs:label>colorimetry, declared again</rdfs:label>
            </owl:Class>
            <owl:Class rdf:about="http://purl.obolibrary.org/obo/CHMO_0000999">
              <owl:deprecated rdf:datatype="http://www.w3.org/2001/XMLSchema#boolean">true</owl:deprecated>
            </owl:Class>
          </rdf:RDF>
        XML
        file.flush
      end
    end

    after { owl.close! }

    it 'imports classes without oboInOwl:id under the id of their IRI' do
      described_class.import_owl(owl_name, owl.path)

      expect(term('BFO:0000002').label).to eq 'continuant'
      expect(term('CHMO:0000953').parent).to eq term('BFO:0000002')
    end

    it 'takes the term id from the IRI when oboInOwl:id names another class' do
      described_class.import_owl(owl_name, owl.path)

      expect(term('CHMO:0002934').label).to eq 'open circuit voltage'
      expect(term('CHMO:0002937').label).to eq 'potentiostatic electrochemical impedance spectroscopy'
    end

    it 'hangs the subclasses of an obsolete class under the class replacing it' do
      described_class.import_owl(owl_name, owl.path)

      expect(term('OBI:0000094')).to be_nil
      expect(term('CHMO:0002196').parent).to eq term('COB:0000110')
    end

    it 'keeps the first class when a term id is declared twice' do
      described_class.import_owl(owl_name, owl.path)

      expect(term('CHMO:0000001').label).to eq 'colorimetry'
    end

    it 'skips deprecated classes' do
      described_class.import_owl(owl_name, owl.path)

      expect(described_class.pluck(:term_id)).not_to include('CHMO:0000999')
    end

    it 'disables the BFO:0000002 branch only' do
      described_class.import_owl(owl_name, owl.path)

      expect(described_class.where(is_enabled: false).pluck(:term_id)).to contain_exactly('BFO:0000002',
                                                                                          'CHMO:0000953')
    end
  end

  describe '.disable_branch_by' do
    it 'disables a term whose child came before it in the import' do
      create_term('CHMO:2', parent: 'CHMO:1')
      create_term('CHMO:1', parent: 'CHMO:3')
      create_term('CHMO:3')
      described_class.rebuilt_ancestry_by_owl_name(owl_name)

      described_class.disable_branch_by(owl_name: owl_name, term_id: 'CHMO:1')

      expect(described_class.where(is_enabled: false).pluck(:term_id)).to contain_exactly('CHMO:1', 'CHMO:2')
    end

    it 'only looks up the term in the given ontology' do
      other = described_class.create!(owl_name: 'rxno', term_id: 'BFO:0000002')
      create_term('BFO:0000002')

      described_class.disable_branch_by(owl_name: owl_name, term_id: 'BFO:0000002')

      expect(term('BFO:0000002').is_enabled).to be false
      expect(other.reload.is_enabled).to be true
    end

    it 'requires the ontology name' do
      expect { described_class.disable_branch_by(term_id: 'BFO:0000002') }.to raise_error(ArgumentError)
    end
  end
end
