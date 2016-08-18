require 'rails_helper'

RSpec.describe Fingerprint, type: :model do
  describe 'creation' do
    let(:fingerprint) { build :fingerprint }

    it 'possible to create valid fingerprint' do
      expect(fingerprint.valid?).to be(true)
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
        fingerprint.fp10 = 8
        fingerprint.valid?
      }.to raise_error(ActiveRecord::StatementInvalid)
    end

    it 'invalid with num_set_bits type is not integer' do
      fingerprint.num_set_bits = "test string"
      expect(fingerprint.valid?).to be(false)
    end

    it 'invalid with num_set_bits is not in the range from 0 to 64' do
      fingerprint.num_set_bits = 100
      expect(fingerprint.valid?).to be(false)

      fingerprint.num_set_bits = 64
      expect(fingerprint.valid?).to be(false)

      fingerprint.num_set_bits = nil
      expect(fingerprint.valid?).to be(false)

      fingerprint.num_set_bits = -1
      expect(fingerprint.valid?).to be(false)

      fingerprint.num_set_bits = 0
      expect(fingerprint.valid?).to be(false)
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
end
