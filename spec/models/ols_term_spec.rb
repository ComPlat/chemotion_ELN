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
