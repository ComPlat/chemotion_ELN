# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::Vessels::Update do
  let(:user) { create(:user) }
  let(:use_case) { described_class.new(params, user) }
  let(:vessel) { use_case.execute! }
  let(:collection) { create(:collection) }
  let(:original_vessel) { create(:vessel) }
  let(:params) do
    {
      vessel_id: original_vessel.id,
      volume_amount: -4,
    }
  end

  describe 'execute!' do
    before do
      CollectionsVessel.create(
        collection: collection,
        vessel: original_vessel,
      )
      user.collections << collection
      user.save
    end

    context 'when data is not valid' do
      it 'error message delivered' do
        expect { vessel }.to raise_error(RuntimeError, 'volume_amount not valid')
      end
    end

    context 'when vessel template was not changed' do
      let(:params) do
        {
          template_name: 'Vessel Template 1',
          vessel_type: 'round bottom flask',
          material_type: 'glass',
          volume_unit: original_vessel.vessel_template.volume_unit,
          volume_amount: 50,
          vessel_id: original_vessel.id,
        }
      end

      it 'vessel has changed' do
        expect(vessel.vessel_template.volume_amount).to be 50
        expect(original_vessel.vessel_template.volume_amount).not_to be 50
      end

      it 'vessel template has not changed' do
        loaded_vessel = Vessel.find(original_vessel.id)
        expect(loaded_vessel.vessel_template.id).to be original_vessel.vessel_template.id
      end
    end

    context 'when vessel template was changed' do
      let(:params) do
        {
          template_name: 'Vessel Template 2',
          vessel_type: 'round bottom flask',
          material_type: 'glass',
          volume_unit: original_vessel.vessel_template.volume_unit,
          volume_amount: 50,
          vessel_id: original_vessel.id,
        }
      end

      it 'vessel has changed' do
        expect(vessel.vessel_template.volume_amount).to be 50
        expect(original_vessel.vessel_template.volume_amount).not_to be 50
      end

      it 'vessel template has changed' do
        loaded_vessel = Vessel.find(vessel.id)
        expect(loaded_vessel.vessel_template.id).not_to be original_vessel.vessel_template.id
      end
    end
  end
end
