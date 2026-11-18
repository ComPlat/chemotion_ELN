# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::Components::Reconcile do
  let(:molecule_a) { create(:molecule) }
  let(:molecule_b) { create(:molecule) }
  let(:sample) { create(:sample, sample_type: Sample::SAMPLE_TYPE_MIXTURE) }
  let!(:component_a) do
    create(:component, sample: sample, name: 'Comp A', position: 0,
                       component_properties: { 'molecule_id' => molecule_a.id, 'amount_mol' => 0.1 })
  end
  let!(:component_b) do
    create(:component, sample: sample, name: 'Comp B', position: 1,
                       component_properties: { 'molecule_id' => molecule_b.id, 'amount_mol' => 0.2 })
  end

  describe '#execute!' do
    # Payload keeps Comp A (renamed), drops Comp B, and adds a brand-new row.
    let(:components_params) do
      [
        { id: component_a.id, name: 'Comp A (edited)', position: 0,
          component_properties: { molecule_id: molecule_a.id, amount_mol: 0.1 } },
        { id: 'new_1', name: 'Comp C', position: 1,
          component_properties: { molecule_id: molecule_b.id, amount_mol: 0.3 } },
      ]
    end

    it 'deletes removed components, updates kept ones, and inserts new ones in a single call' do
      described_class.new(sample, components_params).execute!

      components = Component.where(sample_id: sample.id).order(:position)
      expect(components.pluck(:name)).to eq(['Comp A (edited)', 'Comp C'])
      expect(Component.exists?(component_b.id)).to be(false)
    end

    it 'normalizes string-keyed payloads so the keep-list is honored' do
      string_keyed = [{ 'id' => component_a.id, 'name' => 'Comp A',
                        'component_properties' => { 'molecule_id' => molecule_a.id } }]

      described_class.new(sample, string_keyed).execute!

      expect(Component.where(sample_id: sample.id).pluck(:name)).to contain_exactly('Comp A')
    end
  end
end
