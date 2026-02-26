# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ChemicalAPI do
  let!(:unauthorized_user) { create(:person) }
  let!(:s) { create(:sample) }
  let!(:chemical) { create(:chemical, sample_id: s.id) }

  # Global authentication stub to avoid extra nesting contexts
  before do
    allow(WardenAuthentication).to receive(:new).and_return(instance_double(WardenAuthentication,
                                                                            current_user: unauthorized_user))
  end

  describe 'GET find chemical /api/v1/chemicals' do
    before { get "/api/v1/chemicals?sample_id=#{s.id}&type=sample" }

    it 'is allowed' do
      expect(response).to have_http_status(:ok)
    end

    it 'is able to find chemical entry using sample_id' do
      chem = Chemical.find_by(sample_id: s.id)
      expect(chem).not_to be_nil
      expect(chemical.sample_id).to eq(s.id)
    end

    context 'when chemical does not exist' do
      it 'returns new chemical object with null id' do
        get "/api/v1/chemicals?sample_id=#{s.id + 100_000}&type=sample"
        expect(response.status).to eq 200
        expect(response.body).to include('"id":null')
      end
    end
  end

  describe 'POST create chemical /api/v1/chemicals/create' do
    let(:params) do
      {
        chemical_data: [{ 'cas' => 64_197 }],
        cas: '64197',
        type: 'sample',
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

    context 'when ActiveRecord::RecordInvalid is raised' do
      it 'returns error payload (201 status due to implementation)' do
        allow(Chemical).to receive(:create!).and_raise(ActiveRecord::RecordInvalid.new(Chemical.new))
        post '/api/v1/chemicals/create', params: { sample_id: 999_999, cas: '10-10-0', type: 'sample', chemical_data: [{ 'x' => 'y' }] }
        expect(response.status).to eq 201
        expect(response.body).to include('error')
      end
    end
  end

  describe 'POST update chemical /api/v1/chemicals/:id' do
    let(:chemical) { create(:chemical, id: 1, sample_id: s.id) }
    let(:params) do
      {
        chemical_data: [{ 'cas' => 64_197 }],
        type: 'sample',
        sample_id: s.id,
      }
    end
    let(:attributes) { { chemical_data: params[:chemical_data] } }

    before { put '/api/v1/chemicals', params: params }

    it 'is able to update a new chemical' do
      chemical_entry = Chemical.find(chemical.id).update!(attributes)
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
      # Short-circuit SDS creation to avoid filesystem/network dependencies in this API spec
      allow(Chemotion::ChemicalsService).to receive_messages(
        find_existing_file_by_vendor_product_number_signature: nil,
        create_sds_file: '/safety_sheets/thermofischer/A14672_web_1234567890abcdef.pdf',
      )

      post '/api/v1/chemicals/save_safety_datasheet', params: params
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

    context 'when link unsupported' do
      it 'returns empty body' do
        get '/api/v1/chemicals/chemical_properties', params: { link: 'unknownvendor' }
        expect(response.status).to eq 200
        expect(response.body).to be_empty.or eq('null')
      end
    end
  end

  describe 'PUT update chemicals with no changes' do
    context 'when chemical_data param omitted (validation error)' do
      before do
        # Omitting required chemical_data param triggers 400 via Grape validation
        put '/api/v1/chemicals', params: { sample_id: s.id, type: 'sample' }
      end

      it 'returns 400 bad request' do
        expect(response.status).to eq 400
      end
    end

    context 'when empty chemical_data provided (validation error)' do
      before do
        put '/api/v1/chemicals', params: { sample_id: s.id, type: 'sample', chemical_data: [] }
      end

      it 'returns 400 bad request' do
        expect(response.status).to eq 400
      end
    end

    # Insert success and error handling specs from additional coverage
    context 'when chemical_data present (success path)' do
      let(:sample2) { create(:sample) }
      let(:chem) { create(:chemical, sample_id: sample2.id) }

      it 'updates chemical when chemical_data present' do
        allow(Chemical).to receive(:find_by).and_return(chem)
        allow(chem).to receive(:update!).and_call_original
        put '/api/v1/chemicals',
            params: { sample_id: chem.sample_id, type: 'sample', chemical_data: [{ 'k' => 'v' }] }
        expect(response.status).to eq 200
        expect(chem).to have_received(:update!)
      end
    end

    context 'when update raises ActiveRecord::RecordInvalid' do
      let(:sample2) { create(:sample) }

      it 'returns error hash with 200' do
        chem = create(:chemical, sample_id: sample2.id)
        allow(Chemical).to receive(:find_by).and_return(chem)
        allow(chem).to receive(:update!).and_raise(ActiveRecord::RecordInvalid.new(chem))
        put '/api/v1/chemicals',
            params: { sample_id: chem.sample_id, type: 'sample', chemical_data: [{ 'a' => 'b' }] }
        expect(response.status).to eq 200
        expect(response.body).to include('error')
      end
    end

    context 'when update raises ActiveRecord::StatementInvalid' do
      let(:sample2) { create(:sample) }

      it 'returns error hash with 200' do
        chem = create(:chemical, sample_id: sample2.id)
        allow(Chemical).to receive(:find_by).and_raise(ActiveRecord::StatementInvalid.new('bad SQL'))
        put '/api/v1/chemicals',
            params: { sample_id: chem.sample_id, type: 'sample', chemical_data: [{ 'a' => 'b' }] }
        expect(response.status).to eq 200
        expect(response.body).to include('error')
      end
    end
  end

  # Re-added sections originally below this point (integrated additional coverage tests)
  describe 'POST save safety data sheet error handling' do
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
      allow(Chemotion::ChemicalsService)
        .to receive(:find_existing_or_create_safety_sheet)
        .and_return({ error: 'download failed' })
      post '/api/v1/chemicals/save_safety_datasheet', params: params
    end

    it 'returns 400 with error body' do
      expect(response.status).to eq 400
      expect(JSON.parse(response.body)['error']).to eq 'download failed'
    end
  end

  describe 'POST save safety data sheet success updates chemical' do
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
    let(:sds_path) { '/safety_sheets/thermofisher/A14672_web_1234567890abcd12.pdf' }

    before do
      allow(Chemotion::ChemicalsService).to receive_messages(
        find_existing_file_by_vendor_product_number_signature: nil, create_sds_file: sds_path,
      )
      post '/api/v1/chemicals/save_safety_datasheet', params: params
    end

    it 'returns 201 and persists safetySheetPath entry' do
      expect(response.status).to eq 201
      chem = Chemical.find_by(sample_id: s.id)
      safety_paths = chem.chemical_data[0]['safetySheetPath']
      expect(safety_paths).to be_an(Array)
      key = 'A14672_1234567890abcd12_link'
      mapped = safety_paths.map(&:keys).flatten
      expect(mapped).to include(key)
    end
  end

  describe 'POST save safety data sheet missing nested product info' do
    let(:sample2) { create(:sample) }

    it 'returns 400 due to missing vendor product info' do
      post '/api/v1/chemicals/save_safety_datasheet',
           params: { sample_id: sample2.id, cas: '123-45-6', chemical_data: [{}] }
      expect(response.status).to eq 400
    end
  end

  describe 'GET safety_phrases thermofischer' do
    context 'when product info present (returns phrases)' do
      let(:chemical_tf) do
        create(:chemical, chemical_data: [{ 'alfaProductInfo' => { 'productNumber' => 'A14672' } }])
      end

      before do
        allow(Chemotion::ChemicalsService)
          .to receive(:safety_phrases_thermofischer)
          .and_return({ 'h_statements' => { 'H200' => ' test' } })
        get "/api/v1/chemicals/safety_phrases/#{chemical_tf.sample_id}?vendor=thermofischer"
      end

      it 'returns 200 with hazard statements' do
        parsed = response.body&.start_with?('{') ? JSON.parse(response.body) : nil
        expect(response.status).to eq 200
        expect(parsed['h_statements']).to have_key('H200')
      end
    end

    context 'when chemical has no chemical_data (returns 204)' do
      let(:chem_no_data) { create(:chemical, chemical_data: []) }

      before do
        get "/api/v1/chemicals/safety_phrases/#{chem_no_data.sample_id}?vendor=thermofischer"
      end

      it 'returns 204 no content' do
        expect(response.status).to eq 204
      end
    end
  end

  describe 'GET safety_phrases merck' do
    context 'when product info present (returns pictograms)' do
      let(:chemical_merck) do
        create(:chemical,
               chemical_data: [{ 'merckProductInfo' => { 'productLink' => 'https://sigmaaldrich.com/product' } }])
      end

      before do
        allow(Chemotion::ChemicalsService).to receive(:safety_phrases_merck).and_return({ 'pictograms' => %w[GHS01] })
        get "/api/v1/chemicals/safety_phrases/#{chemical_merck.sample_id}?vendor=merck"
      end

      it 'returns 200 with pictograms' do
        parsed = response.body&.start_with?('{') ? JSON.parse(response.body) : nil
        expect(response.status).to eq 200
        expect(parsed['pictograms']).to include('GHS01')
      end
    end

    context 'when chemical has no chemical_data (returns 204)' do
      let(:chem_no_data) { create(:chemical, chemical_data: []) }

      before do
        get "/api/v1/chemicals/safety_phrases/#{chem_no_data.sample_id}?vendor=merck"
      end

      it 'returns 204 no content' do
        expect(response.status).to eq 204
      end
    end
  end

  describe 'GET safety_phrases unknown vendor' do
    context 'when chemical_data exists but vendor info missing (returns message)' do
      let(:chemical_empty) { create(:chemical, chemical_data: [{ 'otherInfo' => {} }]) }

      before do
        get "/api/v1/chemicals/safety_phrases/#{chemical_empty.sample_id}?vendor=unknown"
      end

      it 'returns informative not found message with 200' do
        expect(response.status).to eq 200
        expect(response.body).to include('No safety phrases could be found')
      end
    end

    context 'when chemical has no chemical_data (returns 204)' do
      let(:chem_no_data) { create(:chemical, chemical_data: []) }

      before do
        get "/api/v1/chemicals/safety_phrases/#{chem_no_data.sample_id}?vendor=unknown"
      end

      it 'returns 204 no content' do
        expect(response.status).to eq 204
      end
    end
  end

  describe 'GET chemical_properties merck link' do
    before do
      allow(Chemotion::ChemicalsService).to receive(:chemical_properties_merck).and_return({ 'grade' => '200' })
      get '/api/v1/chemicals/chemical_properties', params: { link: 'https://www.sigmaaldrich.com/item' }
    end

    it 'returns merck properties' do
      body = JSON.parse(response.body)
      expect(body['grade']).to eq('200')
    end
  end

  describe 'GET fetch_safetysheet unknown vendor triggers both' do
    let(:molecule) { create(:molecule, names: ['Water'], cas: ['7732-18-5']) }

    before do
      allow(Molecule).to receive(:find).and_return(molecule)
      allow(Chemotion::ChemicalsService).to receive_messages(alfa: { alfa_link: 'alfa' },
                                                             merck: { merck_link: 'merck' })
      get "/api/v1/chemicals/fetch_safetysheet/#{molecule.id}?data[vendor]=Unknown&data[option]=CAS&data[language]=en"
    end

    it 'returns both vendor links' do
      body = JSON.parse(response.body)
      expect(body).to have_key('alfa_link')
      expect(body).to have_key('merck_link')
    end
  end

  describe 'GET fetch_safetysheet vendor branches' do
    let(:molecule) { create(:molecule, names: ['Water'], cas: ['7732-18-5']) }

    before { allow(Molecule).to receive(:find).and_return(molecule) }

    it 'returns merck_link only for Merck vendor' do
      allow(Chemotion::ChemicalsService).to receive(:merck).and_return('merck_link_val')
      get "/api/v1/chemicals/fetch_safetysheet/#{molecule.id}?data[vendor]=Merck&data[option]=CAS&data[language]=en"
      expect(response.status).to eq 200
      expect(response.body).to include('merck_link')
      expect(response.body).not_to include('alfa_link')
    end

    it 'returns alfa_link only for Thermofisher vendor' do
      allow(Chemotion::ChemicalsService).to receive(:alfa).and_return('alfa_link_val')
      path = "/api/v1/chemicals/fetch_safetysheet/#{molecule.id}" \
             '?data[vendor]=Thermofisher&data[option]=CAS&data[language]=en'
      get path
      expect(response.status).to eq 200
      expect(response.body).to include('alfa_link')
      expect(response.body).not_to include('merck_link')
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
