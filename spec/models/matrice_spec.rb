# frozen_string_literal: true

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
  end
end
