# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ChemicalAPI do
  let!(:unauthorized_user) { create(:person) }
  let!(:s) { create(:sample) }
  let!(:chemical) { create(:chemical, sample_id: s.id) }

  context 'with unauthorized user find chemical' do
    let(:warden_authentication_instance) { instance_double(WardenAuthentication) }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_authentication_instance)
      allow(warden_authentication_instance).to receive(:current_user).and_return(unauthorized_user)
    end

    describe 'GET find chemical /api/v1/chemicals' do
      before { get "/api/v1/chemicals?sample_id=#{s.id}" }

      it 'is allowed' do
        expect(response).to have_http_status(:ok)
      end

      it 'is able to find chemical entry using sample_id' do
        chem = Chemical.find_by(sample_id: s.id)
        expect(chem).not_to be_nil
        expect(chemical.sample_id).to eq(s.id)
      end
    end

    describe 'POST create chemical /api/v1/chemicals/create' do
      let(:params) do
        {
          chemical_data: [{ 'cas' => 64_197 }],
          sample_id: s.id,
        }
      end

      before { post '/api/v1/chemicals/create', params: params }

      it 'is able to create a new chemical entry' do
        chem_entry = Chemical.find(chemical.id)
        expect(chem_entry).not_to be_nil
      end

      it 'is able to find chemical using sample_id' do
        chem_entry = Chemical.find_by(sample_id: s.id)
        expect(chem_entry).not_to be_nil
      end
    end

    describe 'POST update chemical /api/v1/chemicals/:id' do
      let(:chemical) { create(:chemical, id: 1, sample_id: s.id) }
      let(:params) do
        {
          id: 1,
          chemical_data: [{ 'cas' => 64_197 }],
          sample_id: s.id,
        }
      end
      let(:attributes) { { chemical_data: params[:chemical_data] } }

      before { post "/api/v1/chemicals/#{chemical.id}", params: params }

      it 'is able to update a new chemical' do
        chemical_entry = Chemical.find(params[:id]).update!(attributes)
        expect(chemical_entry).not_to be_nil
      end
    end

    describe 'POST save safety data sheet /api/v1/chemicals/save_sds' do
      let(:chemical) { create(:chemical, id: 1, sample_id: s.id) }
      let(:params) do
        {
          chemical_data: [{
            'alfaProductInfo' => {
              'productNumber' => 'A14672',
              'vendor' => 'Thermofisher',
              'sdsLink' => 'https://www.alfa.com/en/catalog/A14672',
            },
          }],
          cas: '629-59-4',
          sample_id: s.id,
          vendor_product: 'alfaProductInfo',
        }
      end

      before do
        post '/api/v1/chemicals/save_safety_datasheet', params: params
        stub_request(:get, 'https://www.alfa.com/en/catalog/A14672')
          .with(headers:
          {
            'Accept' => '*/*',
            'Access-Control-Request-Method' => 'GET',
            'User-Agent' => 'Google Chrome',
          })
          .to_return(status: 200, body: '', headers: {})
      end

      it 'saves the safety data sheet' do
        expect(response).to have_http_status(:created)
      end
    end

    describe 'GET fetch response from vendors API /api/v1/chemicals/fetch_safetysheet' do
      let(:chemical) { create(:chemical, id: 1, sample_id: s.id) }
      let(:params) do
        {
          id: 2,
          vendor: 'thermofischer',
          option: 'CAS',
          language: 'en',
        }
      end

      before do
        stub_request(:get, 'https://www.alfa.com/en/search/?q=')
          .with(headers:
          {
            'Accept' => '*/*',
            'Accept-Encoding' => 'gzip, deflate, br',
            'Access-Control-Request-Method' => 'GET',
          })
          .to_return(status: 200, body: '', headers: {})
        stub_request(:get, 'https://www.sigmaaldrich.com/US/en/search')
          .with(headers:
          {
            'Accept' => '*/*',
            'Accept-Encoding' => 'gzip, deflate, br',
            'Access-Control-Request-Method' => 'GET',
            'User-Agent' => 'Google Chrome',
          })
          .to_return(status: 200, body: '', headers: {})
        get(
          "/api/v1/chemicals/fetch_safetysheet/#{chemical.sample_id}?" \
          "data[vendor]=#{params[:vendor]}&" \
          "data[option]=#{params[:option]}&" \
          "data[language]=#{params[:language]}",
          params: params,
        )
      end

      it 'fetches the response from merck/thermofischer api' do
        expect(response).to have_http_status(:ok)
      end
    end

    describe 'GET safety phrases /api/v1/chemicals/safety_phrases' do
      let(:chemical) { create(:chemical, id: 1, sample_id: s.id) }
      let(:params) { { vendor: 'Thermofisher' } }

      before do
        get "/api/v1/chemicals/safety_phrases/#{chemical.sample_id}?vendor=#{params[:vendor]}"
      end

      it 'returns no content' do
        expect(response).to have_http_status(:no_content)
      end
    end

    describe 'GET chemical properties /api/v1/chemicals/chemical_properties' do
      let(:params) { { link: 'alfa' } }

      before { get '/api/v1/chemicals/chemical_properties', params: params }

      it 'response is ok with params as link' do
        expect(response).to have_http_status(:ok)
      end
    end
  end

  describe 'POST /api/v1/chemicals/save_manual_sds' do
    let(:vendor_info) { { productNumber: 'ABC123', vendor: 'testVendor' }.to_json }
    let(:vendor_name) { 'TestVendor' }
    let(:vendor_product) { 'testVendorProductInfo' }
    let(:chemical_data) { { cas: 64_197 }.to_json }

    let(:params) do
      {
        sample_id: s.id,
        vendor_info: vendor_info,
        vendor_name: vendor_name,
        vendor_product: vendor_product,
      }
    end
    let(:mock_file) { fixture_file_upload('spec/fixtures/upload.pdf', 'application/pdf') }

    let(:warden_authentication_instance) { instance_double(WardenAuthentication) }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_authentication_instance)
      allow(warden_authentication_instance).to receive(:current_user).and_return(unauthorized_user)
      allow(Chemotion::ManualSdsService).to receive(:create_manual_sds)
    end

    context 'when saving SDS is successful' do
      before do
        chemical = Chemical.new(sample_id: s.id)
        allow(Chemotion::ManualSdsService).to receive(:create_manual_sds)
          .with(anything)
          .and_return(chemical)
      end

      it 'returns a 201 created status' do
        post '/api/v1/chemicals/save_manual_sds', params: params.merge(attached_file: mock_file)
        expect(response.status).to eq 201
      end

      it 'returns a 201 created status with chemical_data' do
        post '/api/v1/chemicals/save_manual_sds', params: params.merge(
          attached_file: mock_file,
          chemical_data: chemical_data,
        )
        expect(response.status).to eq 201
      end
    end

    context 'when error occurs during saving SDS' do
      before do
        allow(Chemotion::ManualSdsService).to receive(:create_manual_sds)
          .with(anything)
          .and_return({ error: 'attached_file is missing' })
      end

      it 'returns a 400 status with error message' do
        post '/api/v1/chemicals/save_manual_sds', params: params
        expect(response.status).to eq 400
        expect(JSON.parse(response.body)['error']).to eq 'attached_file is missing'
      end
    end

    context 'when exception occurs' do
      before do
        allow(Chemotion::ManualSdsService).to receive(:create_manual_sds)
          .with(anything)
          .and_raise(StandardError.new('Test error'))
      end

      it 'returns a 500 status with error message' do
        post '/api/v1/chemicals/save_manual_sds', params: params.merge(attached_file: mock_file)
        expect(response.status).to eq 500
        expect(JSON.parse(response.body)['error']).to include 'Test error'
      end
    end
  end
end
