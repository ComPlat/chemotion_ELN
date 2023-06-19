# frozen_string_literal: true

require 'rails_helper'
describe Chemotion::ThirdPartyAppAPI do
  include_context 'api request authorization context'

  describe 'ListThirdPartyApps API', type: :request do
    describe 'GET /listThirdPartyApps/all' do
      before do
        ThirdPartyApp.create(IPAddress: 'http://test.com', name: 'Test1')
        ThirdPartyApp.create(IPAddress: 'http://test.com', name: 'Test2')
      end

      it 'status of get request 200?' do
        get '/api/v1/thirdPartyApps/listThirdPartyApps/all'
        expect(response).to have_http_status(:ok)
      end

      it 'returns all thirdPartyApps?' do
        get '/api/v1/thirdPartyApps/listThirdPartyApps/all'
        response_data = JSON.parse(response.body)
        expect(response_data.length).to eq(2)
      end

      it 'entry of apps correct?' do
        get '/api/v1/thirdPartyApps/listThirdPartyApps/all'
        response_data = JSON.parse(response.body)
        arr = [response_data[0]['name'], response_data[1]['name'],
               response_data[0]['IPAddress'], response_data[1]['IPAddress']]
        expect(arr).to eq(['Test1', 'Test2', 'http://test.com', 'http://test.com'])
      end
    end
  end

  describe 'NewThirdPartyApp API', type: :request do
    let(:user_id) do
      users = User.all
      user = users[0]
      User.find(user.id).update(type: 'Admin')
      user.id
    end

    describe 'POST /newThirdPartyApp' do
      let(:params) do
        {
          userID: user_id,
          IPAddress: '127.0.0.1',
          name: 'Example App',
        }
      end

      it 'Number of third party apps correct?' do
        post '/api/v1/thirdPartyApps/newThirdPartyApp', params: params
        expect(ThirdPartyApp.count).to eq(1)
      end

      it 'Entries of new third party app correct?' do
        post '/api/v1/thirdPartyApps/newThirdPartyApp', params: params
        tpas = [ThirdPartyApp.last.IPAddress, ThirdPartyApp.last.name]
        expect(tpas).to eq([params[:IPAddress], params[:name]])
      end
    end
  end

  describe 'EditThirdPartyApp API', type: :request do
    let(:user_id) do
      users = User.all
      user = users[0]
      User.find(user.id).update(type: 'Admin')
      user.id
    end

    let(:tpa_id) do
      ThirdPartyApp.create(IPAddress: 'http://test.com', name: 'Test1')
      tpas = ThirdPartyApp.all
      tpa = tpas[0]
      tpa.id
    end

    describe 'POST /editThirdPartyApp' do
      let(:params_all) do
        {
          userID: user_id,
          id: tpa_id,
          IPAddress: '127.0.0.1',
          name: 'Example App',
        }
      end

      let(:params_name) do
        {
          userID: user_id,
          id: tpa_id,
          IPAddress: 'http://test.com',
          name: 'Example App',
        }
      end

      let(:params_ip) do
        {
          userID: user_id,
          id: tpa_id,
          IPAddress: '127.0.0.1',
          name: 'Test1',
        }
      end

      it 'Change of ip address & name successfull?' do
        post '/api/v1/thirdPartyApps/editThirdPartyApp', params: params_all
        tpas = [ThirdPartyApp.last.IPAddress, ThirdPartyApp.last.name]
        expect(tpas).to eq([params_all[:IPAddress], params_all[:name]])
      end

      it 'Change of name successfull?' do
        post '/api/v1/thirdPartyApps/editThirdPartyApp', params: params_name
        tpas = [ThirdPartyApp.last.IPAddress, ThirdPartyApp.last.name]
        expect(tpas).to eq([params_name[:IPAddress], params_name[:name]])
      end

      it 'Change of ip address successfull?' do
        post '/api/v1/thirdPartyApps/editThirdPartyApp', params: params_ip
        tpas = [ThirdPartyApp.last.IPAddress, ThirdPartyApp.last.name]
        expect(tpas).to eq([params_ip[:IPAddress], params_ip[:name]])
      end
    end
  end

  describe 'DeleteThirdPartyApp', type: :request do
    let(:user_id) do
      users = User.all
      user = users[0]
      User.find(user.id).update(type: 'Admin')
      user.id
    end

    let(:tpa_id) do
      ThirdPartyApp.create(IPAddress: 'http://test.com', name: 'Test1')
      tpas = ThirdPartyApp.all
      tpa = tpas[0]
      tpa.id
    end

    describe 'POST /deleteThirdPartyApp' do
      let(:params) do
        {
          userID: user_id,
          id: tpa_id,
        }
      end

      it 'Can third party app be deleted?' do
        post '/api/v1/thirdPartyApps/deleteThirdPartyApp', params: params
        expect(ThirdPartyApp.count).to eq(0)
      end
    end
  end

  describe 'GetByIDThirdPartyApp', type: :request do
    before do
      ThirdPartyApp.create(IPAddress: 'http://test1.com', name: 'Test1')
      ThirdPartyApp.create(IPAddress: 'http://test2.com', name: 'Test2')
      ThirdPartyApp.create(IPAddress: 'http://test3.com', name: 'Test3')
      ThirdPartyApp.create(IPAddress: 'http://test4.com', name: 'Test4')
    end

    let(:tpas) do
      tpas = ThirdPartyApp.all
      tpas.pluck(:id)
    end

    describe 'GET /GetByIDThirdPartyApp' do
      let(:params1) do
        {
          id: tpas[0],
        }
      end

      let(:params3) do
        {
          id: tpas[2],
        }
      end

      it 'Is access by ID 1 of third party apps successfull?' do
        get '/api/v1/thirdPartyApps/GetByIDThirdPartyApp/all', params: params1
        response_data = JSON.parse(response.body)
        res = [response_data['name'], response_data['IPAddress']]
        expect(res).to eq(['Test1', 'http://test1.com'])
      end

      it 'Is access by ID 3 of third party apps successfull?' do
        get '/api/v1/thirdPartyApps/GetByIDThirdPartyApp/all', params: params3
        response_data = JSON.parse(response.body)
        res = [response_data['name'], response_data['IPAddress']]
        expect(res).to eq(['Test3', 'http://test3.com'])
      end
    end
  end

  describe 'listThirdPartyAppNames', type: :request do
    before do
      ThirdPartyApp.create(IPAddress: 'http://test1.com', name: 'Test1')
      ThirdPartyApp.create(IPAddress: 'http://test2.com', name: 'Test2')
    end

    describe 'GET /listThirdPartyAppNames' do
      it 'Get all names' do
        get '/api/v1/thirdPartyApps/listThirdPartyAppNames/all'
        response_data = JSON.parse(response.body)
        res = [response_data[0], response_data[1]]
        expect(res).to eq(%w[Test1 Test2])
      end
    end
  end

  describe 'GetIPThirdPartyApp', type: :request do
    before do
      ThirdPartyApp.create(IPAddress: 'http://test1.com', name: 'Test1')
      ThirdPartyApp.create(IPAddress: 'http://test2.com', name: 'Test2')
    end

    describe 'GET /GetIPThirdPartyApp' do
      let(:params) do
        {
          name: 'Test1',
        }
      end

      it 'Get ip address by name works?' do
        get '/api/v1/thirdPartyApps/GetIPThirdPartyApp/all', params: params
        response_data = JSON.parse(response.body)
        expect(response_data).to eq('http://test1.com')
      end
    end
  end

  describe 'GetAttachmentToken', type: :request do
    let(:user_id) do
      users = User.all
      users[0].id
    end

    let(:params) do
      {
        attID: 1,
        userID: user_id,
      }
    end

    describe 'GET /GetAttachmentToken' do
      it 'Get attachment token?' do
        get '/api/v1/thirdPartyApps/GetAttachmentToken/all', params: params
        token = JSON.parse(response.body)
        payload = JWT.decode(token, Rails.application.secrets.secret_key_base)
        res = [payload[0]['attID'], payload[0]['userID']]
        expect(res).to eq(['1', user_id.to_s])
      end
    end
  end
end
