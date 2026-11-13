# frozen_string_literal: true

require 'rails_helper'

RSpec.describe OlsTerms::DefaultFiles do
  let(:dir) { Pathname.new(Dir.mktmpdir) }
  let(:owl) do
    Tempfile.new(['rxno', '.owl']).tap do |file|
      file.write(<<~XML)
        <?xml version="1.0"?>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                 xmlns:owl="http://www.w3.org/2002/07/owl#"
                 xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">
          <owl:Ontology rdf:about="http://purl.obolibrary.org/obo/rxno.owl"/>
          <owl:Class rdf:about="http://purl.obolibrary.org/obo/BFO_0000015">
            <rdfs:label>process</rdfs:label>
          </owl:Class>
          <owl:Class rdf:about="http://purl.obolibrary.org/obo/RXNO_0000024">
            <rdfs:subClassOf rdf:resource="http://purl.obolibrary.org/obo/BFO_0000015"/>
            <rdfs:label>Heck reaction</rdfs:label>
          </owl:Class>
        </rdf:RDF>
      XML
      file.flush
    end
  end
  let!(:existing) { OlsTerm.create!(owl_name: 'rxno', term_id: 'RXNO:1', label: 'already imported') }

  after do
    owl.close!
    FileUtils.remove_entry(dir)
  end

  describe '.build' do
    it 'imports a local OWL file and reports its counts' do
      result = described_class.build('rxno', owl_path: owl.path, dir: dir)

      expect(result).to eq(source: owl.path, terms: 2, enabled: 2)
      expect(dir.children.map { |path| path.basename.to_s }).to contain_exactly('rxno.default.json',
                                                                                'rxno.default.edited.json')
    end

    it 'writes the tree without database ids' do
      described_class.build('rxno', owl_path: owl.path, dir: dir)

      child = JSON.parse(dir.join('rxno.default.json').read).dig('ols_terms', 0, 'children', 0)
      expect(child).to include('value' => 'RXNO:0000024 | Heck reaction')
      expect(child).not_to have_key('id')
    end

    it 'leaves the database unchanged' do
      described_class.build('rxno', owl_path: owl.path, dir: dir)

      expect(OlsTerm.pluck(:id, :term_id)).to eq [[existing.id, 'RXNO:1']]
    end
  end
end
