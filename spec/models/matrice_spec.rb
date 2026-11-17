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

  describe '.gen_matrices_json' do
    let(:json_file) { instance_double(Pathname, write: nil) }

    before do
      allow(Rails.root).to receive(:join).and_call_original
      allow(Rails.root).to receive(:join).with('config/matrices.json').and_return(json_file)
    end

    it 'writes the name to id mapping of all matrices' do
      matrice = create(:matrice, name: 'someFeature')
      described_class.gen_matrices_json

      expect(json_file).to have_received(:write).with("#{{ 'someFeature' => matrice.id }.to_json}\n").at_least(:once)
    end

    it 'writes an empty mapping when the table cannot be read' do
      allow(described_class).to receive(:pluck).and_raise(ActiveRecord::StatementInvalid)
      described_class.gen_matrices_json

      expect(json_file).to have_received(:write).with("{}\n")
    end
  end

  describe 'json regeneration callbacks' do
    before { allow(described_class).to receive(:gen_matrices_json) }

    it 'regenerates the json after create' do
      create(:matrice)

      expect(described_class).to have_received(:gen_matrices_json).once
    end

    it 'regenerates the json after destroy' do
      matrice = create(:matrice)
      matrice.destroy

      expect(described_class).to have_received(:gen_matrices_json).twice
    end
  end

  describe '.extra_rules' do
    it 'returns the extra rules of the userProvider matrice when enabled' do
      rules = { 'enable' => true, 'domains' => ['kit.edu'] }
      create(:matrice, name: 'userProvider', configs: { 'extra_rules' => rules })

      expect(described_class.extra_rules).to eq rules
    end

    it 'returns an empty hash when the extra rules are disabled' do
      create(:matrice, name: 'userProvider', configs: { 'extra_rules' => { 'enable' => false } })

      expect(described_class.extra_rules).to eq({})
    end

    it 'returns an empty hash without userProvider matrice' do
      expect(described_class.extra_rules).to eq({})
    end
  end

  describe '.molecule_viewer' do
    it 'merges the enabled flag with the configs' do
      create(:matrice, :enabled, name: 'moleculeViewer', configs: { 'url' => 'https://viewer' })

      expect(described_class.molecule_viewer).to eq('feature_enabled' => true, 'url' => 'https://viewer')
    end

    it 'gives indifferent access to the result' do
      create(:matrice, :enabled, name: 'moleculeViewer', configs: { 'url' => 'https://viewer' })

      expect(described_class.molecule_viewer[:url]).to eq 'https://viewer'
    end

    it 'reports the feature as disabled without matrice' do
      expect(described_class.molecule_viewer).to eq('feature_enabled' => false)
    end
  end

  describe '.fast_input' do
    it 'gives indifferent access to nested configs' do
      create(:matrice, :disabled, name: 'fastInput', configs: { 'parser' => { 'mode' => 'strict' } })

      expect(described_class.fast_input).to include(feature_enabled: false)
      expect(described_class.fast_input.dig(:parser, :mode)).to eq 'strict'
    end
  end

  describe '.configs_for' do
    it 'is private' do
      expect { described_class.configs_for('fastInput') }.to raise_error(NoMethodError)
    end
  end

  describe '#destroy' do
    it 'soft-deletes the matrice' do
      matrice = create(:matrice)
      matrice.destroy

      expect(described_class.with_deleted.find(matrice.id).deleted_at).to be_present
    end
  end
end
