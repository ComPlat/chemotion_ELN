# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::Vessels::Create do
  let(:user) { create(:user) }
  let(:vessel) { use_case.execute! }
  let(:use_case) { described_class.new(params,user) }
  let(:collection) { create(:collection) }

  let(:params) do {
    collection_id: collection.id,
    template_name: 'Vessel Template 1',
    details: 'multi-neck',
    vessel_type: 'round bottom flask',
    volume_unit: 'ml',
    volume_amount: 500,
    material_type: 'glass',
    material_details: 'other material details',
    name: 'Vessel 1', 
    description: 'description of Vessel 1',
  }
  end

  describe 'execute!' do
    context 'when input is not valid' do
      context 'when volume amount is negative' do
        before do
          params[:volume_amount] = -1
        end

        it 'error message' do
          expect { vessel }.to raise_error(RuntimeError, 'volume_amount not valid')
        end
      end

      context 'when amount is not present' do
        before do
          params.delete(:volume_amount)
        end
        
        it 'error message' do
          expect { vessel }.to raise_error(RuntimeError, 'volume_amount not valid')
        end
      end

      context 'when amount is not an integer' do
        before do
          params[:volume_amount] = 'abc'
        end

        it 'error message' do
          expect { vessel }.to raise_error(RuntimeError, 'volume_amount not valid')
        end
      end

      context 'when vessel template name is not present' do
        before do
          params[:template_name] = []
        end

        it 'error message' do
          expect { vessel }.to raise_error(RuntimeError, 'template_name not valid')
        end
      end

      context 'when vessel template name is not a string' do
        before do
          params[:template_name] = 1
        end

        it 'error message' do
          expect { vessel }.to raise_error(RuntimeError, 'template_name not valid')
        end
      end
    end  
    context 'when vessel template already exists' do
      let(:loaded_vessel) { Vessel.find(vessel.id) }
      let(:loaded_vessel_template) { VesselTemplate.find(loaded_vessel.vessel_template_id) }

      before do
        params[:template_name] = 'Vessel Template 1'
        create(:vessel_template)
      end

      it 'vessel was saved' do
        expect(loaded_vessel).not_to be_nil
        expect(loaded_vessel.name).to eq('Vessel 1')
        expect(loaded_vessel.description).to eq('description of Vessel 1')
      end

      it 'existing vessel template used' do
        expect(loaded_vessel_template).not_to be_nil
        expect(loaded_vessel_template.name).to eq('Vessel Template 1')
        expect(loaded_vessel_template.details).to eq('multi-neck')
        expect(loaded_vessel_template.vessel_type).to eq('round bottom flask')
        expect(loaded_vessel_template.volume_unit).to eq('ml')
        expect(loaded_vessel_template.volume_amount).to eq(500)
        expect(loaded_vessel_template.material_type).to eq('glass')
        expect(loaded_vessel_template.material_details).to eq('other material details')
      end

      it 'no new vessel template created, old one was used' do
        expect{ vessel }.not_to change(VesselTemplate, :count)
      end
    end

    context 'when vessel template does not exist' do
      let(:loaded_vessel) { Vessel.find(vessel.id) }
      let(:loaded_vessel_template) { VesselTemplate.find(loaded_vessel.vessel_template_id) }

      it 'vessel was saved' do
        expect(loaded_vessel).not_to be_nil
        expect(loaded_vessel.name).to eq('Vessel 1')
        expect(loaded_vessel.description).to eq('description of Vessel 1')
      end

      it 'new vessel template saved' do
        expect(loaded_vessel_template).not_to be_nil
        expect(loaded_vessel_template.name).to eq('Vessel Template 1')
        expect(loaded_vessel_template.details).to eq('multi-neck')
        expect(loaded_vessel_template.vessel_type).to eq('round bottom flask')
        expect(loaded_vessel_template.volume_unit).to eq('ml')
        expect(loaded_vessel_template.volume_amount).to eq(500)
        expect(loaded_vessel_template.material_type).to eq('glass')
        expect(loaded_vessel_template.material_details).to eq('other material details')
      end

      it 'new vessel template created' do
        expect { vessel }.to change(VesselTemplate, :count)
      end
    end
  end
end
