# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::PartnerAppAPI do
  let(:user) { create(:user, first_name: 'Person', last_name: 'Test') }
  let(:partner_app_1) { PartnerApp.create!(name: 'third party app 1', url: '1st.com') }
  let(:partner_app_2) { PartnerApp.create!(name: 'third party app 2', url: '2nd.com') }

  before do
    allow_any_instance_of(WardenAuthentication).to(
      receive(:current_user).and_return(user)
    )

    partner_app_1.save!
    partner_app_2.save!
  end

  context 'authorized user logged in' do
    describe 'Get all partner_apps GET partner_app' do
      before do
        get '/api/v1/partner_app'
      end

      it 'return all partner apps' do
        expect(JSON.parse(response.body)['partner_apps']).not_to be_empty
        expect(JSON.parse(response.body)['partner_apps'].length).to eq(2)
      end
    end
  end

  let!(:admin) { create(:admin, first_name: 'Jane', last_name: 'Doe') }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user)
      .and_return(admin)
  end

  context 'authorized admin logged in' do
    describe 'Get a partner_app by id GET partner_app/:id' do
      before do
        get '/api/v1/partner_app/' + partner_app_1[:id].to_s
      end

      it 'return all partner apps' do
        expect(JSON.parse(response.body)['partner_app']).not_to be_empty
        expect(JSON.parse(response.body)['partner_app']['id']).to eq(partner_app_1[:id])
        expect(JSON.parse(response.body)['partner_app']['name']).to eq(partner_app_1[:name])
        expect(JSON.parse(response.body)['partner_app']['url']).to eq(partner_app_1[:url])
      end
    end

    describe 'Update a partner_app by id PUT partner_app/:id' do
      let(:params) do
        {
          'id' => partner_app_1[:id],
          'name' => '3rd App',
          'url' => '3rdApp'
        }
      end

      before do
        put '/api/v1/partner_app/' + partner_app_1[:id].to_s, params: params
      end

      it 'return updated partner app' do
        result = PartnerApp.find(partner_app_1[:id])
        expect(result[:id]).to eq(partner_app_1[:id])
        expect(result[:name]).to eq(params['name'])
        expect(result[:url]).to eq(params['url'])
      end
    end

    describe 'Create a partner_app by id POST partner_app/:id' do
      let(:params) do
        {
          'name' => '3rd App',
          'url' => '3rdApp'
        }
      end

      before do
        post '/api/v1/partner_app', params: params
      end

      it 'return a new partner app' do
        result = JSON.parse(response.body)
        expect(PartnerApp.count).to eq(3)
        expect(result['name']).to eq(params['name'])
        expect(result['url']).to eq(params['url'])
      end
    end

    describe 'Delete a partner_app by id DELETE partner_app/:id' do
      before do
        delete '/api/v1/partner_app/' + partner_app_1[:id].to_s
      end

      it 'delete a partner app' do
        expect(PartnerApp.count).to eq(1)
        expect(response.body).to eq("true")
        expect(PartnerApp.where(id: partner_app_1[:id]).take).to eq(nil)
      end
    end
  end
end
