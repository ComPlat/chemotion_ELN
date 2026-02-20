# frozen_string_literal: true

# == Schema Information
#
# Table name: chemicals
#
#  id                                     :bigint           not null, primary key
#  cas                                    :text
#  chemical_data                          :jsonb
#  deleted_at                             :datetime
#  updated_at                             :datetime
#  sample_id                              :integer
#  sequence_based_macromolecule_sample_id :bigint
#
# Foreign Keys
#
#  fk_rails_...  (sequence_based_macromolecule_sample_id => sequence_based_macromolecule_samples.id)
#
require 'rails_helper'

RSpec.describe Chemical do
  describe 'creation' do
    let(:sample) { create(:sample) }
    let!(:chemical) { create(:chemical, sample_id: sample.id) }

    it 'is possible to create a valid chemical entry' do
      expect(chemical.valid?).to be(true)
    end
  end

  describe 'parent validations' do
    context 'when belonging to a sample only' do
      let(:chemical) { create(:chemical) }

      it 'is valid' do
        expect(chemical).to be_valid
      end
    end

    context 'when belonging to a sequence_based_macromolecule_sample only' do
      let(:sbmm) { create(:uniprot_sbmm) }
      let(:sbmm_sample) do
        create(:sequence_based_macromolecule_sample,
               sequence_based_macromolecule: sbmm,
               user: create(:person))
      end
      let(:chemical) { build(:chemical, sample: nil, sequence_based_macromolecule_sample: sbmm_sample) }

      it 'is valid' do
        expect(chemical).to be_valid
      end
    end

    context 'when belonging to both a sample and a sequence_based_macromolecule_sample' do
      let(:sample) { create(:sample) }
      let(:sbmm) { create(:uniprot_sbmm) }
      let(:sbmm_sample) do
        create(:sequence_based_macromolecule_sample,
               sequence_based_macromolecule: sbmm,
               user: create(:person))
      end
      let(:chemical) do
        build(:chemical,
              sample_id: sample.id,
              sequence_based_macromolecule_sample_id: sbmm_sample.id)
      end

      it 'is invalid' do
        expect(chemical).not_to be_valid
      end

      it 'adds an error on base' do
        chemical.valid?
        expect(chemical.errors[:base]).to include(
          'Chemical can belong to either a sample or a sequence_based_macromolecule_sample, not both',
        )
      end
    end

    context 'when belonging to neither a sample nor a sequence_based_macromolecule_sample' do
      let(:chemical) { Chemical.new }

      it 'is invalid' do
        expect(chemical).not_to be_valid
      end

      it 'adds an error on base' do
        chemical.valid?
        expect(chemical.errors[:base]).to include(
          'Chemical must belong to either a sample or a sequence_based_macromolecule_sample',
        )
      end
    end
  end
end
