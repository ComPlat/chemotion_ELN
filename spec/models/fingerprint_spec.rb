require 'rails_helper'

RSpec.describe Fingerprint, type: :model do
  describe 'creation' do
    let(:fingerprint) { build :fingerprint }
    let(:new_fingerprint) { build :fingerprint }

    it 'possible to create valid fingerprint' do
      expect(fingerprint.valid?).to be(true)
    end

    it 'validates the presence of fp fields' do
      expect(FactoryGirl.build(:fingerprint, :fp0 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp1 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp2 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp3 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp4 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp5 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp6 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp7 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp8 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp9 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp10 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp11 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp12 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp13 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp14 => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :fp15 => "")).to_not be_valid
    end

    it 'validates the presence of num_set_bits' do
      expect(FactoryGirl.build(:fingerprint, :num_set_bits => "")).to_not be_valid
      expect(FactoryGirl.build(:fingerprint, :num_set_bits => nil)).to_not be_valid
    end

    it 'invalid lenght of fingerprint is not 64' do
      fingerprint.fp15 = "10"
      expect(fingerprint.valid?).to be(false)

      fingerprint.fp11 = "10101010101010101010101010101010101010101010101010101010101010101010"
      expect(fingerprint.valid?).to be(false)
    end

    it 'invalid with fingerprint type is not binary' do
      fingerprint.fp10 = nil
      expect(fingerprint.valid?).to be(false)

      expect {
        fingerprint.fp1 = 8
        fingerprint.valid?
      }.to raise_error(ActiveRecord::StatementInvalid)

      expect {
        fingerprint.fp5 = "invalid string"
        fingerprint.valid?
      }.to raise_error(ActiveRecord::StatementInvalid)
    end

    it 'invalid with num_set_bits type is not integer' do
      fingerprint.num_set_bits = "invalid string"
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

      fingerprint.num_set_bits = 0
      expect(fingerprint.valid?).to be(false)
    end

    it 'must check if fingerprint existed' do
      Fingerprint::NUMBER_OF_FINGERPRINT_COL.times do |i|
        new_fingerprint.send("fp" + i.to_s + "=", fingerprint["fp" + i.to_s])
      end

      expect { fingerprint.save! }.to change{ Fingerprint.count }
      expect { new_fingerprint.save! }.to raise_error(ActiveRecord::RecordInvalid)
    end
  end

  describe 'deletion' do
    let(:fingerprint) { create(:fingerprint) }
    let(:sample)      { create(:sample, fingerprint_id: fingerprint.id) }

    it 'fasle if associated sample existed' do
      fingerprint.destroy
      expect(fingerprint.destroyed?).to be(false)
    end

    it 'only soft deletes fingerprint' do
      expect(Fingerprint.with_deleted).to eq [fingerprint]
    end
  end

  context 'using molfile' do
    let(:polymer_molfile) {
      <<-MOLFILE

  Ketcher 08221616432D 1   1.00000     0.00000     0

  2  1  0     0  0            999 V2000
    2.8250   -5.1500    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0
    3.8250   -5.1500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0     0  0
M  RGP  1   1   1
M  END
> <PolymersList>
0
0
$$$$

MOLFILE
    }

    it 'should standardized molfile a fingerprint' do
      standard = Fingerprint.standardized_molfile(polymer_molfile)

      expect(standard.include? 'R#').to be(false)
      expect(standard.include? 'R1').to be(true)
      expect(standard.include? 'PolymersList').to be(false)
    end

    it 'should create a fingerprint' do
      fp_id = Fingerprint.find_or_create_by_molfile(polymer_molfile)
      fp = Fingerprint.find(fp_id)

      expect(fp.fp0).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp1).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp2).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp3).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp4).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp5).to eq("0000000000000000000000000000000000000001000000000000000000000000")
      expect(fp.fp6).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp7).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp8).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp9).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp10).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp11).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp12).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp13).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp14).to eq("0000000000000000000000000000000000000000000000000000000000000000")
      expect(fp.fp15).to eq("0000000000000000000000000000000000000000000000000000000000000001")

      expect(fp.num_set_bits).to eq(2)
    end

    it 'should return correct similar search' do
      fp_id = Fingerprint.find_or_create_by_molfile(polymer_molfile)
      fp = Fingerprint.find(fp_id)

      fp_vector = [0, 0, 0, 0, 0, 16777216, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
      expect(Fingerprint.count_bits_set(fp_vector)).to eq(2)

      fp_ids = Fingerprint.search_similar(fp_vector, 0.8)
      expect(fp_ids).to include(fp_id)

      fp_ids = Fingerprint.search_similar(fp_vector, 1)
      expect(fp_ids).to include(fp_id)
    end

    it 'should return correct substructure search' do
      fp_vector = [0, 0, 0, 0, 0, 16777216, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]

      fp_id = Fingerprint.find_or_create_by_molfile(polymer_molfile)
      fp = Fingerprint.find(fp_id)

      fp_ids = Fingerprint.screen_sub(fp_vector)
      expect(fp_ids).to include(fp_id)
    end
  end
end
