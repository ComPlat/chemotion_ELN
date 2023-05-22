# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::CellLines::Create do  
  let(:user){create(:user)}
 
  let(:params) do
    {
      amount: 100,
      passage: 42,
      contamination: '',
      source:'IPB',
      growth_medium:'water',
      name:'probe-123',
      description:'none',
      material_names:['name-001,name-002'],
      type:'primary cells',
      organism:'mouse',
      tissue:'leg',
      disease:'cancer',
      biosafety_level:'S0',
      variant:'v1',
      optimal_growth_temp:36.3,
      cryo_pres_medium:'nitrogen',
      gender:'male',
      material_description:'a cell'
    }
  end
  describe 'execute!' do
    context 'when data is not valid' do
      let(:use_case){Usecases::CellLines::Create.new(params,user)}
      before do
        use_case.execute!
      end

      it 'error message delivered' do
        
      end

      it 'no cell line object was saved' do
      end
    end

    context 'when cell line material does already exist' do
      it 'cell line sample was saved' do
      end

      it 'new cell line material was not saved' do
      end
    end

    context 'when cell line material does not yet exist' do
      it 'cell line sample was saved' do
      end

      it 'new cell line material was saved' do
      end
    end
  end
end
