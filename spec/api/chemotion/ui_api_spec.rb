# frozen_string_literal: true

require 'rails_helper'

class StubConfig
  class_attribute :url
end

describe Chemotion::UiAPI do
  let(:user) { create(:user) }

  before do
    allow_any_instance_of(WardenAuthentication).to(
      receive(:current_user).and_return(user),
    )
  end

  context 'GET /api/v1/ui/initialize' do
    describe 'without spectra config' do
      before do
        StubConfig.url = false
        Rails.configuration.spectra.chemspectra = StubConfig
        get '/api/v1/ui/initialize'
      end

      it 'return ChemSpectra config' do
        rsp = JSON.parse(response.body)
        expect(rsp['has_chem_spectra']).to be(false)
      end
    end

    describe 'with spectra config' do
      before do
        StubConfig.url = true
        Rails.configuration.spectra.chemspectra = StubConfig
        get '/api/v1/ui/initialize'
      end

      it 'return ChemSpectra config' do
        rsp = JSON.parse(response.body)
        expect(rsp['has_chem_spectra']).to be(true)
      end
    end

    describe 'ui_components config' do
      before do
        allow(Rails.configuration).to receive(:ui_components).and_return(
          ActiveSupport::OrderedOptions.new.merge(weighing_tasks: false),
        )
        get '/api/v1/ui/initialize'
      end

      it 'returns the ui_components map' do
        rsp = JSON.parse(response.body)
        expect(rsp['ui_components']).to eq('weighing_tasks' => false)
      end
    end
  end
end
