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
  let(:obo) { 'http://purl.obolibrary.org/obo/' }

  def owl_node(id, label: "label #{id}", parent: nil, **extra)
    node = { 'id' => id, 'label' => label }
    node['subClassOf'] = { 'rdf:resource' => "#{obo}#{parent.tr(':', '_')}" } if parent
    node.merge(extra)
  end

  def term(term_id)
    described_class.find_by(owl_name: owl_name, term_id: term_id)
  end

  describe 'NODE_RECENTLY_SELECTED' do
    it 'is a frozen, non-selectable placeholder node' do
      expect(described_class::NODE_RECENTLY_SELECTED).to be_frozen
      expect(described_class::NODE_RECENTLY_SELECTED).to include(selectable: false, value: 'recently selected')
    end
  end

  describe '.create_from_owl_nodes' do
    it 'inserts one term per node' do
      described_class.create_from_owl_nodes([owl_node('CHMO:1'), owl_node('CHMO:2')], owl_name)

      expect(described_class.where(owl_name: owl_name).pluck(:term_id)).to match_array %w[CHMO:1 CHMO:2]
    end

    it 'skips nodes without id and deprecated nodes' do
      nodes = [owl_node(nil), owl_node('CHMO:1', 'deprecated' => 'true'), owl_node('CHMO:2')]
      described_class.create_from_owl_nodes(nodes, owl_name)

      expect(described_class.pluck(:term_id)).to eq %w[CHMO:2]
    end

    it 'does nothing for an empty slice' do
      expect { described_class.create_from_owl_nodes([], owl_name) }.not_to change(described_class, :count)
    end

    it 'stores the parent term id from subClassOf' do
      described_class.create_from_owl_nodes([owl_node('CHMO:2', parent: 'CHMO:1')], owl_name)

      expect(term('CHMO:2').ancestry_term_id).to eq 'CHMO:1'
    end

    it 'uses the first of several subClassOf entries' do
      node = owl_node('CHMO:3', 'subClassOf' => [{ 'rdf:resource' => "#{obo}CHMO_0000001" }, { 'Restriction' => {} }])
      described_class.create_from_owl_nodes([node], owl_name)

      expect(term('CHMO:3').ancestry_term_id).to eq 'CHMO:0000001'
    end

    it 'falls back to the equivalentClass intersection for the parent' do
      equivalent = { 'Class' => { 'intersectionOf' => { 'Description' => { 'rdf:about' => "#{obo}RXNO_0000001" } } } }
      node = owl_node('RXNO:0000024', 'subClassOf' => { 'Restriction' => {} }, 'equivalentClass' => equivalent)
      described_class.create_from_owl_nodes([node], 'rxno')

      expect(described_class.find_by(term_id: 'RXNO:0000024').ancestry_term_id).to eq 'RXNO:0000001'
    end

    it 'joins multiple labels and descriptions' do
      node = owl_node('CHMO:1', label: %w[first second], 'IAO_0000115' => %w[one two])
      described_class.create_from_owl_nodes([node], owl_name)

      expect(term('CHMO:1')).to have_attributes(label: 'first - second', desc: 'one - two')
    end

    it 'stores a single synonym as synonym and synonym list' do
      described_class.create_from_owl_nodes([owl_node('CHMO:1', 'hasExactSynonym' => 'NMR')], owl_name)

      expect(term('CHMO:1')).to have_attributes(synonym: 'NMR', synonyms: %w[NMR])
    end

    it 'picks the shortest of several synonyms' do
      node = owl_node('CHMO:1', 'hasExactSynonym' => ['NMR spectroscopy', 'NMR'])
      described_class.create_from_owl_nodes([node], owl_name)

      expect(term('CHMO:1')).to have_attributes(synonym: 'NMR', synonyms: ['NMR spectroscopy', 'NMR'])
    end

    it 'keeps the raw node and version info as metadata' do
      node = owl_node('CHMO:1')
      described_class.create_from_owl_nodes([node], owl_name, version_info: { 'v' => '1' })

      expect(term('CHMO:1').metadata).to eq('klass' => node, 'version' => { 'v' => '1' })
    end

    it 'quotes values safely' do
      described_class.create_from_owl_nodes([owl_node('CHMO:1', label: "it's'); DROP TABLE ols_terms; --")], owl_name)

      expect(term('CHMO:1').label).to eq "it's'); DROP TABLE ols_terms; --"
    end
  end

  describe '.rebuilt_ancestry_by_owl_name' do
    context 'when parents are inserted before their children' do
      before do
        nodes = [owl_node('T:0'), owl_node('T:1', parent: 'T:0'), owl_node('T:2', parent: 'T:1')]
        described_class.create_from_owl_nodes(nodes, owl_name)
        described_class.rebuilt_ancestry_by_owl_name(owl_name)
      end

      it 'builds the full ancestor chain' do
        expect(term('T:2').ancestors.pluck(:term_id)).to eq %w[T:0 T:1]
      end

      it 'keeps the top term as root' do
        expect(term('T:0')).to be_root
        expect(term('T:0').descendants.count).to eq 2
      end
    end

    context 'when a term references an unknown parent' do
      it 'leaves the term at root level' do
        described_class.create_from_owl_nodes([owl_node('T:1', parent: 'T:missing')], owl_name)
        described_class.rebuilt_ancestry_by_owl_name(owl_name)

        expect(term('T:1')).to be_root
      end
    end

    context 'when terms of another ontology share the term ids' do
      it 'only links terms within the same ontology' do
        described_class.create_from_owl_nodes([owl_node('T:0')], 'other')
        described_class.create_from_owl_nodes([owl_node('T:0'), owl_node('T:1', parent: 'T:0')], owl_name)
        described_class.rebuilt_ancestry_by_owl_name(owl_name)

        expect(term('T:1').parent).to eq term('T:0')
      end
    end
  end

  describe '.import_and_create_ols_from_file_path' do
    let(:file_path) { Rails.root.join('spec/fixtures/ols/mini_chmo.owl') }

    before { described_class.import_and_create_ols_from_file_path(owl_name, file_path) }

    it 'imports all non-deprecated classes' do
      expect(described_class.where(owl_name: owl_name).pluck(:term_id))
        .to match_array %w[CHMO:0000000 CHMO:0000001 CHMO:0000002]
    end

    it 'links the imported terms into a tree' do
      expect(term('CHMO:0000002').ancestors.pluck(:term_id)).to eq %w[CHMO:0000000 CHMO:0000001]
    end

    it 'stores the ontology version with every term' do
      version = term('CHMO:0000000').metadata['version']

      expect(version['versionIRI']['rdf:resource']).to end_with '2022-04-19/chmo.owl'
    end
  end

  describe '.delete_owl_by_name' do
    it 'deletes only the terms of the given ontology' do
      described_class.create_from_owl_nodes([owl_node('T:1')], owl_name)
      described_class.create_from_owl_nodes([owl_node('T:1')], 'other')

      described_class.delete_owl_by_name(owl_name)

      expect(described_class.pluck(:owl_name)).to eq %w[other]
    end
  end

  describe 'enabling and disabling' do
    before do
      nodes = [owl_node('T:0'), owl_node('T:1', parent: 'T:0'), owl_node('T:2', parent: 'T:1'), owl_node('T:9')]
      described_class.create_from_owl_nodes(nodes, owl_name)
      described_class.rebuilt_ancestry_by_owl_name(owl_name)
    end

    def enabled_term_ids
      described_class.where(is_enabled: true).order(:term_id).pluck(:term_id)
    end

    describe '.disable_branch_by' do
      it 'disables the term and all its descendants' do
        described_class.disable_branch_by(owl_name: owl_name, term_id: 'T:1')

        expect(enabled_term_ids).to eq %w[T:0 T:9]
      end

      it 'ignores unrelated keys' do
        described_class.disable_branch_by(owl_name: owl_name, term_id: 'T:9', label: 'ignored')

        expect(enabled_term_ids).to eq %w[T:0 T:1 T:2]
      end

      it 'returns nil when the term does not exist' do
        expect(described_class.disable_branch_by(owl_name: owl_name, term_id: 'T:missing')).to be_nil
        expect(enabled_term_ids.size).to eq 4
      end
    end

    describe '.disable_by_ids' do
      it 'disables the given ids' do
        described_class.disable_by_ids([term('T:0').id, term('T:9').id])

        expect(enabled_term_ids).to eq %w[T:1 T:2]
      end
    end

    describe '.enable_by_ids' do
      it 'enables the given ids' do
        described_class.disable_by_ids(described_class.pluck(:id))
        described_class.enable_by_ids(term('T:2').id)

        expect(enabled_term_ids).to eq %w[T:2]
      end
    end

    describe '.switch_by_ids' do
      it 'disables by default and accepts a single id' do
        described_class.switch_by_ids(term('T:9').id)

        expect(enabled_term_ids).to eq %w[T:0 T:1 T:2]
      end
    end
  end

  describe '.write_public_file' do
    it 'writes the tree as json into public/ontologies' do
      allow(File).to receive(:write)

      described_class.write_public_file('chmo', ols_terms: [{ id: 1 }])

      expect(File).to have_received(:write)
        .with(Rails.public_path.join('ontologies', 'chmo.json'), '{"ols_terms":[{"id":1}]}')
    end
  end
end
