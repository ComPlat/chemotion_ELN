# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::Components::DeleteRemovedComponents do
  let(:sample) { create(:sample) }
  let(:use_case) { described_class.new(sample.id, components_params) }

  describe '#execute!' do
    let!(:component_a) { create(:component, sample: sample, position: 1) }
    let!(:component_b) { create(:component, sample: sample, position: 2) }
    let!(:component_c) { create(:component, sample: sample, position: 3) }

    context 'when ids_to_keep are integer ids' do
      let(:components_params) { [{ id: component_a.id }, { id: component_b.id }] }

      it 'deletes only the components not in the keep list' do
        use_case.execute!
        remaining_ids = Component.where(sample_id: sample.id).pluck(:id)
        expect(remaining_ids).to contain_exactly(component_a.id, component_b.id)
        expect(remaining_ids).not_to include(component_c.id)
      end
    end

    context 'when ids_to_keep are numeric string ids' do
      let(:components_params) { [{ id: component_a.id.to_s }, { id: component_b.id.to_s }] }

      it 'treats numeric strings as existing ids and preserves those components' do
        use_case.execute!
        remaining_ids = Component.where(sample_id: sample.id).pluck(:id)
        expect(remaining_ids).to contain_exactly(component_a.id, component_b.id)
        expect(remaining_ids).not_to include(component_c.id)
      end
    end

    context 'when ids_to_keep mix integer ids and placeholder string ids' do
      let(:components_params) do
        [{ id: component_a.id }, { id: 'new_1' }, { id: 'comp_xyz' }]
      end

      it 'keeps the component with a real integer id and ignores placeholder ids' do
        use_case.execute!
        remaining_ids = Component.where(sample_id: sample.id).pluck(:id)
        expect(remaining_ids).to contain_exactly(component_a.id)
        expect(remaining_ids).not_to include(component_b.id, component_c.id)
      end
    end

    context 'when all ids are placeholder strings' do
      let(:components_params) { [{ id: 'new_1' }, { id: 'new_2' }] }

      it 'deletes all existing components for the sample' do
        use_case.execute!
        expect(Component.where(sample_id: sample.id).count).to eq(0)
      end
    end

    context 'when components_params is empty' do
      let(:components_params) { [] }

      it 'deletes all existing components for the sample' do
        use_case.execute!
        expect(Component.where(sample_id: sample.id).count).to eq(0)
      end
    end

    context 'when all existing component ids are in the keep list' do
      let(:components_params) do
        [{ id: component_a.id }, { id: component_b.id }, { id: component_c.id }]
      end

      it 'does not delete any components' do
        use_case.execute!
        expect(Component.where(sample_id: sample.id).count).to eq(3)
      end
    end

    it 'does not affect components belonging to other samples' do
      other_sample = create(:sample)
      other_component = create(:component, sample: other_sample, position: 1)

      described_class.new(sample.id, []).execute!

      expect(Component.find_by(id: other_component.id)).to be_present
    end
  end
end
