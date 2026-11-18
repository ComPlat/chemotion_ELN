# frozen_string_literal: true

# == Schema Information
#
# Table name: matrices
#
#  id          :integer          not null, primary key
#  configs     :jsonb            not null
#  deleted_at  :datetime
#  enabled     :boolean          default(FALSE)
#  exclude_ids :integer          default([]), is an Array
#  include_ids :integer          default([]), is an Array
#  label       :string
#  name        :string           not null
#  created_at  :datetime
#  updated_at  :datetime
#
# Indexes
#
#  index_matrices_on_name  (name) UNIQUE
#
require 'rails_helper'

RSpec.describe Matrice do
  describe 'creation' do
    let(:matrice) { build(:matrice) }
    let(:matrice_disabled) { build(:matrice, :disabled, id: nil) }
    let(:matrice_enabled) { build(:matrice, :enabled, id: nil) }

    it 'is valid' do
      matrice.save!
      described_class.reset_sequence(52)
      matrice_enabled.save!
      expect(matrice).to be_valid
      expect(matrice.id).to be < 31
    end

    it 'remove out of range matrices' do
      described_class.reset_sequence
      matrice_disabled.save!
      matrice_disabled.update_column(:id, 355_555) # rubocop:disable Rails/SkipsModelValidations
      matrice_enabled.save!
      expect(matrice_enabled.id).to be < 31
      expect(described_class.where(name: matrice_disabled.name)).to be_empty
    end

    it 'removes a matrice at id 31, whose bit would overflow users.matrix' do
      described_class.reset_sequence
      matrice_disabled.save!
      matrice_disabled.update_column(:id, 31) # rubocop:disable Rails/SkipsModelValidations
      matrice_enabled.save!
      expect(described_class.where(name: matrice_disabled.name)).to be_empty
      expect(matrice_enabled.id).to be <= 30
    end

    it 'gives a new matrice id 30 when the highest id is 29' do
      described_class.reset_sequence
      matrice_disabled.save!
      matrice_disabled.update_column(:id, 29) # rubocop:disable Rails/SkipsModelValidations
      matrice_enabled.save!
      expect(matrice_enabled.id).to eq(30)
    end

    context 'when the highest id is already 30' do
      before do
        described_class.reset_sequence
        matrice_disabled.save!
        matrice_disabled.update_column(:id, 30) # rubocop:disable Rails/SkipsModelValidations
      end

      it 'refuses a new matrice instead of giving it id 31' do
        expect(matrice_enabled.save).to be(false)
        expect(matrice_enabled.errors[:id]).to be_present
        expect(described_class.find_by(name: matrice_enabled.name)).to be_nil
      end

      it 'keeps the matrice at id 30' do
        matrice_enabled.save
        expect(described_class.find_by(name: matrice_disabled.name)&.id).to eq(30)
      end

      it 'also refuses when the matrice at id 30 is soft-deleted' do
        described_class.find(30).destroy
        expect(matrice_enabled.save).to be(false)
      end
    end
  end

  describe 'users matrix' do
    let!(:user) { create(:person) }
    let!(:feature) { create(:matrice, :enabled) }

    def feature_bit
      user.reload.matrix[feature.id]
    end

    it 'has the bit of an enabled feature set' do
      expect(feature_bit).to eq(1)
    end

    it 'clears the bit when the feature is disabled' do
      feature.update!(enabled: false)
      expect(feature_bit).to eq(0)
    end

    it 'clears the bit when the feature is soft-deleted' do
      feature.destroy
      expect(feature_bit).to eq(0)
    end

    it 'sets the bit again when the feature is restored' do
      feature.destroy
      described_class.with_deleted.find(feature.id).restore
      expect(feature_bit).to eq(1)
    end

    it 'clears the bit when the feature is hard-deleted' do
      feature.really_destroy!
      expect(feature_bit).to eq(0)
    end
  end
end
