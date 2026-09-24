# frozen_string_literal: true

# == Schema Information
#
# Table name: components
#
#  id                   :bigint           not null, primary key
#  component_properties :jsonb
#  deleted_at           :datetime
#  name                 :string
#  position             :integer
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  sample_id            :bigint           not null
#
# Indexes
#
#  index_components_on_sample_id  (sample_id)
#
# Foreign Keys
#
#  fk_rails_...  (sample_id => samples.id)
#
require 'rails_helper'

RSpec.describe Component do
  let(:component) { build(:component) }

  describe 'associations' do
    it { is_expected.to belong_to(:sample) }
  end

  describe 'validations' do
    it 'is valid with the factory defaults' do
      expect(component).to be_valid
    end

    describe 'position' do
      it 'allows nil' do
        component.position = nil

        expect(component).to be_valid
      end

      it 'rejects non-integer numbers' do
        component.position = 1.5

        expect(component).not_to be_valid
        expect(component.errors[:position]).to be_present
      end
    end

    describe 'component_properties' do
      it 'rejects values that are not a Hash' do
        component.component_properties = [1, 2]

        expect(component).not_to be_valid
        expect(component.errors[:component_properties]).to include('must be a Hash')
      end

      it 'rejects nil' do
        component.component_properties = nil

        expect(component).not_to be_valid
        expect(component.errors[:component_properties]).to include('must be a Hash')
      end

      it 'rejects a Hash without molecule_id' do
        component.component_properties = { 'purity' => 1 }

        expect(component).not_to be_valid
        expect(component.errors[:component_properties]).to include('must contain a valid molecule_id')
      end

      it 'rejects a non-positive molecule_id' do
        component.component_properties = { 'molecule_id' => 0 }

        expect(component).not_to be_valid
        expect(component.errors[:component_properties]).to include('must contain a valid molecule_id')
      end

      it 'rejects a non-numeric molecule_id' do
        component.component_properties = { 'molecule_id' => 'abc' }

        expect(component).not_to be_valid
      end

      it 'accepts a numeric string molecule_id' do
        component.component_properties = { 'molecule_id' => '42' }

        expect(component).to be_valid
      end

      it 'accepts a symbol molecule_id key' do
        component.component_properties = { molecule_id: 42 }

        expect(component).to be_valid
      end
    end
  end

  describe '#destroy' do
    it 'soft deletes the component' do
      component = create(:component)
      component.destroy

      expect(described_class.find_by(id: component.id)).to be_nil
      expect(described_class.with_deleted.find(component.id).deleted_at).to be_present
    end
  end

  describe 'history' do
    it 'records changes with logidze' do
      component = create(:component)
      component.update!(name: 'Renamed')

      expect(described_class.with_log_data.find(component.id).log_data.version).to eq 2
    end
  end
end
