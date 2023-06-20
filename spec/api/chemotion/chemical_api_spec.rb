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
      before do
        get "/api/v1/chemicals?sample_id=#{s.id}"
      end

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

      before do
        post '/api/v1/chemicals/create', params: params
      end

      it 'is able to create a new chemical entry' do
        chemicl_entry = Chemical.find(chemical.id)
        expect(chemicl_entry).not_to be_nil
      end

      it 'is able to find chemical using sample_id' do
        chemicl_entry = Chemical.find_by(sample_id: s.id)
        expect(chemicl_entry).not_to be_nil
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
      let(:attributes) do
        {
          chemical_data: params[:chemical_data],
        }
      end

      before do
        post "/api/v1/chemicals/#{chemical.id}", params: params
      end

      it 'is able to update a new chemical' do
        chemical_entry = Chemical.find(params[:id]).update!(attributes)
        expect(chemical_entry).not_to be_nil
      end
    end

    describe 'POST save safety data sheet /api/v1/chemicals/save_sds' do
      let(:chemical) { create(:chemical, id: 1, sample_id: s.id) }

      let(:params) do
        {
          chemical_data: [{ 'alfaProductInfo' => {
            'productNumber' => 'A14672', 'vendor' => 'Thermofisher', 'sdsLink' => 'https://www.alfa.com/en/catalog/A14672'
          } }],
          cas: '629-59-4',
          sample_id: s.id,
          vendor_product: 'alfaProductInfo',
        }
      end

      before do
        post '/api/v1/chemicals/save_safety_datasheet', params: params
        stub_request(:get, 'https://www.alfa.com/en/catalog/A14672')
          .with(headers: { 'Accept' => '*/*',
                           'Access-Control-Request-Method' => 'GET', 'User-Agent' => 'Google Chrome' })
          .to_return(status: 200, body: '', headers: {})
      end

      it 'save the safety data sheet' do
        expect(response).to have_http_status(:created)
      end
    end

    # testing behavior, not implementation
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
          .with(headers: { 'Access-Control-Request-Method' => 'GET', 'Accept' => '*/*', 'User-Agent': 'Google Chrome' })
          .to_return(status: 200, body: '', headers: {})
        stub_request(:get, 'https://www.sigmaaldrich.com/US/en/search')
          .with(headers: { 'Accept' => '*/*', 'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
                           'Access-Control-Request-Method' => 'GET',
                           'User-Agent' => 'Google Chrome' })
          .to_return(status: 200, body: '', headers: {})
        get "/api/v1/chemicals/fetch_safetysheet/#{chemical.sample_id}?data[vendor]=#{params[:vendor]}&data[option]=
            #{params[:option]}&data[language]=#{params[:language]}", params: params
      end

      it 'fetches the response from merck/thermofischer api' do
        expect(response).to have_http_status(:ok)
      end
    end

    describe 'GET safety phrases /api/v1/chemicals/safety_phrases' do
      let(:chemical) { create(:chemical, id: 1, sample_id: s.id) }

      let(:params) do
        {
          vendor: 'Thermofisher',
        }
      end

      before do
        get "/api/v1/chemicals/safety_phrases/#{chemical.sample_id}?vendor=#{params[:vendor]}"
      end

      it 'There is no content' do
        expect(response).to have_http_status(:no_content)
      end
    end

    describe 'GET chemical properties /api/v1/chemicals/chemical_properties' do
      let(:params) do
        {
          link: 'alfa',
        }
      end

      before do
        get '/api/v1/chemicals/chemical_properties', params: params
      end

      it 'response is ok with params as link' do
        expect(response).to have_http_status(:ok)
      end
    end
  end
end
