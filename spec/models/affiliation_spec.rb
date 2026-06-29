# frozen_string_literal: true

# == Schema Information
#
# Table name: affiliations
#
#  id           :integer          not null, primary key
#  company      :string
#  country      :string
#  organization :string
#  department   :string
#  group        :string
#  created_at   :datetime
#  updated_at   :datetime
#  from         :date
#  to           :date
#  domain       :string
#  cat          :string
#  ror_id       :string
#

require 'rails_helper'

RSpec.describe Affiliation do
  describe '.normalize_key' do
    it 'returns empty string for blank input' do
      expect(described_class.normalize_key(nil)).to eq('')
      expect(described_class.normalize_key('')).to eq('')
      expect(described_class.normalize_key('   ')).to eq('')
    end

    it 'lowercases and collapses punctuation/whitespace' do
      expect(described_class.normalize_key('Organic   Chemistry!!')).to eq('organic chemistry')
    end

    it 'strips accents' do
      expect(described_class.normalize_key('Jäne')).to eq('jane')
    end

    it 'maps accent+case variants to the same key as the plain form' do
      expect(described_class.normalize_key('Jäne DOË'))
        .to eq(described_class.normalize_key('jane doe'))
    end

    it 'does not merge genuinely different values' do
      expect(described_class.normalize_key('Organic Chemistry'))
        .not_to eq(described_class.normalize_key('Inorganic Chemistry'))
    end

    # Documented limitation: NFKD does not transliterate ü -> ue
    it 'treats umlaut and -ue spellings as distinct' do
      expect(described_class.normalize_key('Müller'))
        .not_to eq(described_class.normalize_key('Mueller'))
    end
  end

  describe '.canonical' do
    let(:base_attrs) { { organization: 'KIT', department: 'Organic Chemistry', group: 'Jäne Doë' } }

    before { described_class.create!(base_attrs) }

    it 'returns the input unchanged when blank' do
      expect(described_class.canonical(:department, '')).to eq('')
      expect(described_class.canonical(:department, nil)).to be_nil
    end

    it 'returns the existing stored value for a near-duplicate department' do
      expect(described_class.canonical(:department, 'organic   chemistry'))
        .to eq('Organic Chemistry')
    end

    it 'matches the reserved-word group column too' do
      expect(described_class.canonical(:group, 'jane doe')).to eq('Jäne Doë')
    end

    it 'returns the input when no stored value matches' do
      expect(described_class.canonical(:department, 'Photochemistry'))
        .to eq('Photochemistry')
    end

    it 'ignores rows with blank values in the field' do
      described_class.create!(organization: 'KIT', department: nil, group: nil)
      expect(described_class.canonical(:department, 'something new'))
        .to eq('something new')
    end
  end
end
