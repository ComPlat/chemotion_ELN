# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::InventoryAPI do
  let!(:unauthorized_user) { create(:person) }
  let!(:author_user) { create(:person) }
  let!(:c) { create(:collection, user: unauthorized_user, is_shared: false) }
  let!(:s) { create(:sample, collections: [c]) }

  context 'with unauthorized user find inventory' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(unauthorized_user)
    end

    describe 'GET find inventory /api/v1/inventories' do
      let(:inventory) { create(:inventory, inventoriable: s, inventoriable_id: s.id, inventoriable_type: Sample) }

      before do
        get "/api/v1/inventories?inventoriable_id=#{inventory.inventoriable_id}&inventoriable_type=#{inventory.inventoriable_type}"
      end

      it 'is allowed' do
        expect(response.status).to eq 200
      end

      it 'is able to find inventory using inventoriable_id' do
        inventory = Inventory.find_by(inventoriable_id: s.id)
        expect(inventory).not_to be_nil
      end
    end

    describe 'POST create inventory /api/v1/inventories/create' do
      let(:inventory) { create(:inventory, inventoriable: s, inventoriable_id: s.id, inventoriable_type: Sample) }
      let(:params) do
        {
          inventory_parameters: [{ 'cas' => 64197 }],
          inventoriable_id: s.id,
          inventoriable_type: 'Sample'
        }
      end

      before do
        post '/api/v1/inventories/create', params: params
      end

      it 'is able to create a new inventory' do
        # inventor = Inventory.find_by(id: params[:id])
        inventor = Inventory.find(inventory.id)
        expect(inventor).not_to be_nil
      end

      it 'is able to find inventory using inventoriable_id' do
        inventor = Inventory.find_by(inventoriable_id: s.id)
        expect(inventor).not_to be_nil
      end
    end

    describe 'POST update inventory /api/v1/inventories/:id' do
      let(:inventory) { create(:inventory, inventoriable: s, id: 1, inventoriable_id: s.id, inventoriable_type: Sample) }

      let(:params) do
        {
          id: 1,
          inventory_parameters: [{ 'cas' => 64197 }],
          inventoriable_id: s.id,
          inventoriable_type: 'Sample'
        }
      end

      let(:attributes) do
        {
          inventory_parameters: params[:inventory_parameters]
        }
      end

      before do
        post "/api/v1/inventories/#{inventory.id}", params: params
      end

      it 'is able to update a new inventory' do
        inventory = Inventory.find(params[:id]).update!(attributes)
        expect(inventory).not_to be_nil
      end
    end

    describe 'POST save safety data sheet /api/v1/inventories/save_sds' do
      let(:inventory) { create(:inventory, inventoriable: s, id: 1, inventoriable_id: s.id, inventoriable_type: Sample) }

      let(:params) do
        {
          inventory_parameters: [{ 'alfaProductInfo' => { 'productNumber' => 'A14672', 'vendor' => 'Thermofischer', 'sdsLink' => 'https://www.alfa.com/en/catalog/A14672' } }],
          inventoriable_id: s.id,
          vendor_product: 'alfaProductInfo'
        }
      end

      before do
        post '/api/v1/inventories/save_sds', params: params
      end

      it 'expect stub request to alfa server to return 200' do
        stub_request(:get, 'https://www.alfa.com/en/catalog/A14672')
          .with(headers: { 'Accept' => '*/*', 'Access-Control-Request-Method' => 'GET', 'User-Agent' => 'Google Chrome' })
          .to_return(status: 200, body: '', headers: {})
      end
    end

    # testing behavior, not implementation
    describe 'GET fetch response from vendors API /api/v1/inventories/fetchsds/:inventoriable_id?data[vendor]=All&data[option]=CAS&data[language]=en' do
      let(:inventory) { create(:inventory, inventoriable: s, inventoriable_id: s.id, inventoriable_type: Sample) }
      let(:cas_number) { 64197 }

      it 'fetches the response from merck api' do
        # expect(HTTParty).to have_received(:get).with(name)
        stub_request(:get, "https://www.sigmaaldrich.com/DE/en/search/#{cas_number}?focus=products&page=1&perpage=30&sort=relevance&term=#{cas_number}&type=product=")
          .with(headers: { 'Access-Control-Request-Method' => 'GET', 'Accept' => '*/*', 'User-Agent': 'Google Chrome' })
          .to_return(status: 200, body: '', headers: {})
      end

      it 'fetches the response from thermofischer api' do
        stub_request(:get, "https://www.alfa.com/en/search/?q=#{cas_number}")
          .with(headers: { 'Access-Control-Request-Method' => 'GET', 'Accept' => '*/*', 'User-Agent': 'Mozilla' })
          .to_return(status: 200, body: '', headers: {})
      end
    end

    describe 'GET safety phrases /api/v1/inventories/safety_phrases' do
      let(:inventory) { create(:inventory, inventoriable: s, inventoriable_id: s.id) }

      let(:params) do
        {
          vendor: 'Thermofischer'
        }
      end

      before do
        get "/api/v1/inventories/safety_phrases/#{inventory.inventoriable_id}?vendor=#{params[:vendor]}"
      end

      it 'There is no content' do
        expect(response.status).to eq 204
      end
    end

    describe 'GET chemical properties /api/v1/inventories/chemical_properties' do
      let(:params) do
        {
          link: 'alfa'
        }
      end

      before do
        get '/api/v1/inventories/chemical_properties', params: params
      end

      it 'response is ok with params as link' do
        expect(response.status).to eq 200
      end
    end
  end
end
