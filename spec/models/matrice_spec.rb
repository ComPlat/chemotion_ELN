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
  end
end
