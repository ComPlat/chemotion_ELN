# frozen_string_literal: true

require 'rails_helper'

class StubConfig
  class_attribute :url
end

describe Chemotion::UiAPI do
  let(:user) { create(:user) }
  before do
    allow_any_instance_of(WardenAuthentication).to(
      receive(:current_user).and_return(user)
    )
  end

  context 'GET /api/v1/ui/initialize' do
    describe 'without spectra config' do
      before do
        StubConfig.url = false
        Rails.configuration.spectra = StubConfig
        get '/api/v1/ui/initialize'
      end
      it 'return ChemSpectra config' do
        rsp = JSON.parse(response.body)
        expect(rsp['has_chem_spectra']).to eq(false)
      end
    end

    describe 'with spectra config' do
      before do
        StubConfig.url = true
        Rails.configuration.spectra = StubConfig
        get '/api/v1/ui/initialize'
      end
      it 'return ChemSpectra config' do
        rsp = JSON.parse(response.body)
        expect(rsp['has_chem_spectra']).to eq(true)
      end
    end
  end
end
