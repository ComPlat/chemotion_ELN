# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Fingerprint, type: :model do
  describe 'creation' do
    let(:fingerprint) { build :fingerprint }
    let(:new_fingerprint) { build :fingerprint }

    it 'possible to create valid fingerprint' do
      expect(fingerprint.valid?).to be(true)
    end

    it 'validates the presence of fp fields' do
      expect(FactoryBot.build(:fingerprint, fp0: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp1: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp2: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp3: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp4: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp5: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp6: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp7: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp8: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp9: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp10: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp11: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp12: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp13: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp14: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, fp15: '')).not_to be_valid
    end

    it 'validates the presence of num_set_bits' do
      expect(FactoryBot.build(:fingerprint, num_set_bits: '')).not_to be_valid
      expect(FactoryBot.build(:fingerprint, num_set_bits: nil)).not_to be_valid
    end

    it 'invalid lenght of fingerprint is not 64' do
      fingerprint.fp15 = '10'
      expect(fingerprint.valid?).to be(false)

      fingerprint.fp11 = '10101010101010101010101010101010101010101010101010101010101010101010'
      expect(fingerprint.valid?).to be(false)
    end

    it 'invalid with fingerprint type is not binary' do
      fingerprint.fp10 = nil
      expect(fingerprint.valid?).to be(false)

      expect(fingerprint.fp1 = 8 && fingerprint.valid?).to be(false)

      expect(
        fingerprint.fp5 = 'invalid string' &&
        fingerprint.valid?
      ).to be(false)
    end

    it 'invalid with num_set_bits type is not integer' do
      fingerprint.num_set_bits = 'invalid string'
      expect(fingerprint.valid?).to be(false)
    end

    it 'invalid with num_set_bits is not in the range from 0 to 64' do
      fingerprint.num_set_bits = 1050
      expect(fingerprint.valid?).to be(false)

      fingerprint.num_set_bits = 1024
      expect(fingerprint.valid?).to be(false)

      fingerprint.num_set_bits = nil
      expect(fingerprint.valid?).to be(false)

      fingerprint.num_set_bits = -1
      expect(fingerprint.valid?).to be(false)

      # fingerprint.num_set_bits = 0
      # expect(fingerprint.valid?).to be(false)
    end

    it 'must check if fingerprint existed' do
      (1..Fingerprint::NUMBER_OF_FINGERPRINT_COL).each do |i|
        new_fingerprint['fp' + i.to_s] = fingerprint['fp' + i.to_s]
      end

      expect { fingerprint.save! }.to change(described_class, :count)
      # expect { new_fingerprint.save! }.to raise_error(ActiveRecord::RecordInvalid)
    end
  end

  describe 'deletion' do
    let(:fingerprint) { build(:fingerprint) }
    let(:sample)      { build(:sample) }

    it 'false if associated sample existed' do
      expect(
        fingerprint.save! && sample.fingerprint_id = fingerprint.id &&
        sample.save && fingerprint.destroy && fingerprint.destroyed?
      ).to be(false)
    end

    # it 'only soft deletes fingerprint' do
    #   expect(Fingerprint.with_deleted).to eq [fingerprint]
    # end
  end

  context 'when using molfile' do
    let(:polymer_molfile) do
      <<~MOLFILE
        test polymer
          Ketcher 09241917192D 1   1.00000     0.00000     0

          2  1  0     0  0            999 V2000
           21.5000   -7.9750    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0
           22.3660   -7.4750    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          1  2  1  0     0  0
        M  RGP  1   1   1
        M  END
        > <PolymersList>
        0
        $$$$

      MOLFILE
    end

    it 'standardized the molfile for fingerprint' do
      standard = described_class.standardized_molfile(polymer_molfile)

      expect(standard.include?('R#')).to be(false)
      expect(standard.include?('R1')).to be(true)
      expect(standard.include?('PolymersList')).to be(false)
    end

    it 'creates a fingerprint' do
      fp_id = described_class.find_or_create_by_molfile(polymer_molfile)&.id
      fp = described_class.find(fp_id)

      expect(fp.fp0).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp1).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp2).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp3).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp4).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp5).to eq('0000000000000000000000000000000000000001000000000000000000000000')
      expect(fp.fp6).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp7).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp8).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp9).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp10).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp11).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp12).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp13).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp14).to eq('0000000000000000000000000000000000000000000000000000000000000000')
      expect(fp.fp15).to eq('0000000000000000000000000000000000000000000000000000000000000001')

      expect(fp.num_set_bits).to eq(2)
    end

    it 'returns correct similar search' do
      fp_id = described_class.find_or_create_by_molfile(polymer_molfile)&.id
      fp = described_class.find(fp_id)

      fp_vector = [0, 0, 0, 0, 0, 16_777_216, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1].map { |e| format('%064b', e) }
      expect(described_class.count_bits_set(fp_vector)).to eq(2)

      expect(described_class.search_similar(fp_vector, 0.8).pluck(:id)).to include(fp_id)
      expect(described_class.search_similar(fp_vector, 1).pluck(:id)).to include(fp_id)
    end

    it 'returns correct substructure search' do
      fp_vector = [0, 0, 0, 0, 0, 16_777_216, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1].map { |e| format('%064b', e) }
      fp_id = described_class.find_or_create_by_molfile(polymer_molfile)&.id

      expect(described_class.screen_sub(fp_vector).pluck(:id)).to include(fp_id)
    end
  end
end
