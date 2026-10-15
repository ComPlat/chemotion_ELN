# frozen_string_literal: true

# == Schema Information
#
# Table name: residues
#
#  id           :integer          not null, primary key
#  sample_id    :integer
#  residue_type :string
#  custom_info  :hstore
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#
# Indexes
#
#  index_residues_on_sample_id  (sample_id)
#
require 'rails_helper'

RSpec.describe Residue do
  it { is_expected.to belong_to(:sample).optional }

  describe 'TYPES' do
    it 'maps each residue type symbol to itself' do
      expect(described_class::TYPES).to eq(polymer: :polymer, residue: :residue)
    end
  end

  describe 'custom_info' do
    it 'is persisted as an hstore with string values' do
      residue = create(:residue, custom_info: { 'loading' => 2.5, 'polymer_type' => 'polystyrene' }).reload

      expect(residue.custom_info).to eq('loading' => '2.5', 'polymer_type' => 'polystyrene')
    end
  end

  describe 'history' do
    it 'records a logidze version on update' do
      residue = create(:residue)
      residue.update!(residue_type: 'residue')

      expect(described_class.with_log_data.find(residue.id).log_data.version).to eq(2)
    end
  end

  describe 'sample association' do
    it 'is reachable from the sample it belongs to' do
      sample = create(:sample)
      residue = create(:residue, sample: sample)

      expect(sample.reload.residues).to include(residue)
    end
  end
end
