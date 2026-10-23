# frozen_string_literal: true

# rubocop:disable RSpec/MultipleExpectations
# rubocop:disable RSpec/MultipleMemoizedHelpers
# rubocop:disable RSpec/AnyInstance

require 'rails_helper'

describe Chemotion::ChemSpectraAPI do
  let(:user) { create(:person) }
  let(:current_user) { user }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(current_user)
  end

  context 'without a logged-in user' do
    let(:current_user) { nil }

    it 'requires login for every route' do
      post '/api/v1/chemspectra/file/convert', params: { mass: '0' }
      expect(response).to have_http_status(:unauthorized)
      post '/api/v1/chemspectra/file/combine_spectra', params: { spectra_ids: [1], front_spectra_idx: 0 }
      expect(response).to have_http_status(:unauthorized)
      get '/api/v1/chemspectra/spectra_layouts'
      expect(response).to have_http_status(:unauthorized)
      get '/api/v1/chemspectra/nmrium_wrapper/host_name'
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'POST /api/v1/chemspectra/file/combine_spectra' do
    let(:owner) { create(:person) }
    let(:owners_collection) { create(:collection, user: owner) }
    let(:sample) { create(:sample, creator: owner, collections: [owners_collection]) }
    let(:dataset) { create(:container, containable: sample, name: 'dataset') }
    let(:spectra) { create_list(:attachment, 2, attachable: dataset, created_by: owner.id, created_for: owner.id) }
    let!(:old_image) do
      create(:attachment, :with_png_image, filename: 'dataset.new_combined.png', attachable: dataset,
                                           created_by: owner.id, created_for: owner.id)
    end
    let(:image) do
      Tempfile.new(['combined', '.png']).tap do |file|
        IO.copy_stream(Rails.root.join('spec/fixtures/upload.png'), file.path)
      end
    end
    let(:spectra_ids) { spectra.map(&:id) }
    let(:combined_images) do
      Attachment.where(filename: 'dataset.new_combined.png', attachable_type: 'Container', attachable_id: dataset.id)
    end

    before do
      allow(Chemotion::Jcamp::CombineImg).to receive(:combine).and_return([nil, image])
      post '/api/v1/chemspectra/file/combine_spectra', params: { spectra_ids: spectra_ids, front_spectra_idx: 0 }
    end

    after { image.close! }

    context 'when the user owns the spectra' do
      let(:current_user) { owner }

      it 'replaces the combined image' do
        expect(response).to have_http_status(:created)
        expect(combined_images.pluck(:id)).to contain_exactly(an_instance_of(Integer))
        expect(combined_images.first.id).not_to eq(old_image.id)
        expect(Attachment.with_deleted.find(old_image.id).deleted_at).to be_present
      end
    end

    context 'when the user cannot access the spectra' do
      it 'refuses and keeps the existing image' do
        expect(response).to have_http_status(:unauthorized)
        expect(Chemotion::Jcamp::CombineImg).not_to have_received(:combine)
        expect(combined_images.pluck(:id)).to eq([old_image.id])
        expect(File.exist?(old_image.reload.abs_path)).to be(true)
      end
    end

    context 'when the user may only read the spectra' do
      let(:shared_collection) do
        create(:collection, user: owner).tap do |collection|
          create(:collection_share, collection: collection, shared_with: user,
                                    permission_level: CollectionShare.permission_level(:read_elements),
                                    sample_detail_level: 10)
        end
      end
      let(:sample) { create(:sample, creator: owner, collections: [shared_collection]) }

      it 'refuses and keeps the existing image' do
        expect(response).to have_http_status(:unauthorized)
        expect(combined_images.pluck(:id)).to eq([old_image.id])
      end
    end

    context 'when a spectrum does not exist' do
      let(:current_user) { owner }
      let(:spectra_ids) { spectra.map(&:id) + [0] }

      it 'returns not found and keeps the existing image' do
        expect(response).to have_http_status(:not_found)
        expect(combined_images.pluck(:id)).to eq([old_image.id])
      end
    end
  end

  describe 'GET /api/v1/chemspectra/spectra_layouts' do
    let(:data_type_file) { Rails.root.join('tmp', "data_type_#{SecureRandom.hex(4)}.json") }
    let(:layouts) { { 'datatypes' => { 'INFRARED' => ['INFRARED SPECTRUM'] } } }

    before do
      allow(Rails.configuration.spectra).to receive(:chemspectra)
        .and_return(ActiveSupport::OrderedOptions.new.merge!(url: 'http://chemspectra.test'))
      allow(Rails.configuration).to receive(:path_spectra_data_type).and_return(data_type_file)
      layouts_response = instance_double(HTTParty::Response, code: 200, body: layouts.to_json)
      allow(HTTParty).to receive(:get).and_return(layouts_response)
    end

    after { FileUtils.rm_f(data_type_file) }

    it 'refuses a non-admin user' do
      get '/api/v1/chemspectra/spectra_layouts'
      expect(response).to have_http_status(:unauthorized)
      expect(HTTParty).not_to have_received(:get)
      expect(File.exist?(data_type_file)).to be(false)
    end

    context 'with an admin' do
      let(:current_user) { create(:admin) }

      it 'writes the data types file only when its content changes' do
        get '/api/v1/chemspectra/spectra_layouts'
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(File.read(data_type_file))).to eq(layouts)

        allow(File).to receive(:write).and_call_original
        get '/api/v1/chemspectra/spectra_layouts'
        expect(response).to have_http_status(:ok)
        expect(File).not_to have_received(:write).with(data_type_file, anything)
      end
    end
  end

  describe 'GET /api/v1/chemspectra/nmrium_wrapper/:host_name' do
    it 'returns the wrapper url to a logged-in user' do
      get '/api/v1/chemspectra/nmrium_wrapper/host_name'
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to have_key('nmrium_url')
    end
  end

  describe 'removed routes' do
    it 'no longer serves the standalone page endpoints' do
      %w[file/save file/refresh molfile/convert predict/nmr_peaks_form predict/infrared].each do |path|
        expect { post "/api/v1/chemspectra/#{path}" }.to raise_error(ActionController::RoutingError)
      end
    end

    it 'no longer routes the standalone pages' do
      %w[/chemspectra /chemspectra-editor].each do |path|
        expect { Rails.application.routes.recognize_path(path) }.to raise_error(ActionController::RoutingError)
      end
    end
  end
end

# rubocop:enable RSpec/AnyInstance
# rubocop:enable RSpec/MultipleMemoizedHelpers
# rubocop:enable RSpec/MultipleExpectations
