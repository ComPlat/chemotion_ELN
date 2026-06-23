# frozen_string_literal: true

# rubocop:disable RSpec/LetSetup,RSpec/MultipleExpectations,RSpec/NestedGroups,RSpec/MultipleMemoizedHelpers

require 'rails_helper'
describe Chemotion::ThirdPartyAppAPI do
  include_context 'api request authorization context'
  let!(:admin1) { create(:admin) }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin1) # rubocop:disable RSpec/AnyInstance
  end

  describe 'GET /third_party_apps/all' do
    let!(:first_3pa) { create(:third_party_app, url: 'http://test1.com', name: 'Test1-app') }
    let!(:second_3pa) { create(:third_party_app, url: 'http://test2.com', name: 'Test2-app') }

    context 'when two apps are available' do
      before do
        get '/api/v1/third_party_apps'
      end

      it 'status of get request 200?' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns all thirdPartyApps?' do
        response_data = JSON.parse(response.body)
        expect(response_data.length).to eq(2)
      end

      it 'entry of apps correct?' do
        response_data = JSON.parse(response.body)
        expect(response_data.first['name']).to eq 'Test1-app'
        expect(response_data.second['name']).to eq 'Test2-app'
        expect(response_data.first['url']).to eq 'http://test1.com'
        expect(response_data.second['url']).to eq 'http://test2.com'
      end
    end
  end

  describe 'POST /api/v1/third_party_apps/admin' do
    let(:params) { { url: 'exampleUrl', name: 'exampleApp', file_types: 'csv' } }

    before do
      post '/api/v1/third_party_apps/admin', params: params
    end

    context 'when parameter are valid' do
      it 'Status code is 201' do
        expect(response).to have_http_status :created
      end

      it 'Number of third party apps correct?' do
        expect(ThirdPartyApp.count).to eq(1)
      end

      it 'Created app has correct properties' do
        expect(ThirdPartyApp.first.name).to eq 'exampleApp'
        expect(ThirdPartyApp.first.url).to eq 'exampleUrl'
        expect(ThirdPartyApp.first.file_types).to eq 'csv'
      end
    end
  end

  describe 'POST /api/v1/third_party_apps/admin/{id}' do
    let(:tpa) { create(:third_party_app) }

    context 'when update is possible' do
      before do
        put "/api/v1/third_party_apps/admin/#{tpa.id}", params: { url: 'changedUrl', name: 'changedName' }
      end

      it 'status code is 201' do
        expect(response).to have_http_status :created
      end

      it 'Properties of app were updated' do
        expect(tpa.reload.name).to eq 'changedName'
        expect(tpa.reload.url).to eq 'changedUrl'
      end
    end

    context 'when update is not possible' do
      before do
        put '/api/v1/third_party_apps/admin/-1', params: { url: 'changedUrl', name: 'changedName' }
      end

      it 'status code is 404' do
        expect(response).to have_http_status :not_found
      end
    end
  end

  describe 'DELETE /api/v1/third_party_apps/admin/{id}' do
    let(:tpa) { create(:third_party_app) }

    context 'when app is deletable' do
      before do
        delete "/api/v1/third_party_apps/admin/#{tpa.id}"
      end

      it 'App is deleted' do
        expect(ThirdPartyApp.count).to eq(0)
      end

      it 'Status code is 201' do
        expect(response).to have_http_status :created
      end
    end
  end

  describe 'GET v1/third_party_apps/{id}' do
    let(:response_data) { JSON.parse(response.body) }
    let!(:first_3pa) { create(:third_party_app, url: 'http://test1.com', name: 'Test1-app') }
    let(:id) { first_3pa.id }

    context 'when 3PA is available' do
      before do
        get "/api/v1/third_party_apps/#{id}"
      end

      it 'Response code is 200' do
        expect(response).to have_http_status :ok
      end

      it 'Response has correct name and url' do
        expect(response_data['name']).to eq 'Test1-app'
        expect(response_data['url']).to eq 'http://test1.com'
      end
    end

    context 'when 3PA is not available' do
      before do
        get '/api/v1/third_party_apps/-1'
      end

      it 'Response code is 404' do
        expect(response).to have_http_status :not_found
      end
    end
  end

  describe 'GET /api/v1/third_party_apps/token' do
    let(:tpa) { create(:third_party_app) }
    let(:collection) { create(:collection, user: admin1) }

    let(:token) do
      parts = CGI.unescape(JSON.parse(response.body))
      parts.split('/').last
    end

    let(:payload) { JsonWebToken.decode(token) }

    context 'when user is allowed to read attachment' do
      context 'when attachment is directly linked and readable and 3pa exists' do
        let!(:research_plan) do
          create(:research_plan, creator: admin1, collections: [collection], attachments: [attachment])
        end
        let(:attachment) { create(:attachment, created_for: admin1.id) }

        before do
          get '/api/v1/third_party_apps/token', params: { appID: tpa.id.to_s, attID: attachment.id.to_s }
        end

        it 'Payload of token is correct' do
          expect(payload['attID']).to eq attachment.id
          expect(payload['userID']).to eq admin1.id
          expect(payload['appID']).to eq tpa.id
        end
      end

      context 'when attachment is nested into analysis and readable and accessable and 3pa exists' do
        let!(:research_plan) do
          create(:research_plan, creator: admin1, collections: [collection], container: root_container)
        end
        let(:root_container) { create(:container, :with_jpg_in_dataset) }
        let(:attachment) do
          attachment = root_container.children.first.children.first.children.first.attachments.first
          attachment.created_for = admin1.id
          attachment.save
          attachment
        end

        before do
          get '/api/v1/third_party_apps/token', params: { appID: tpa.id.to_s, attID: attachment.id.to_s }
        end

        it 'Payload of token is correct' do
          expect(payload['attID']).to eq attachment.id
          expect(payload['userID']).to eq admin1.id
          expect(payload['appID']).to eq tpa.id
        end
      end
    end

    context 'when user is not allowed to read attachment' do
      let(:other_user) { create(:user, collections: [collection]) }

      context 'when attachment is directly linked and readable and 3pa exists' do
        let!(:research_plan) do
          create(:research_plan, creator: other_user, collections: [collection], attachments: [attachment])
        end
        let(:attachment) { create(:attachment, created_for: other_user.id) }

        before do
          get '/api/v1/third_party_apps/token', params: { appID: tpa.id.to_s, attID: attachment.id.to_s }
        end

        it 'status code is 403' do
          expect(response).to have_http_status :forbidden
        end
      end

      context 'when attachment is nested into analysis and readable and accessable and 3pa exists' do
        let(:collection) { create(:collection, user: user) }
        let!(:research_plan) do
          create(:research_plan, creator: other_user, collections: [collection], container: root_container)
        end
        let(:root_container) { create(:container, :with_jpg_in_dataset) }
        let(:attachment) do
          attachment = root_container.children.first.children.first.children.first.attachments.first
          attachment.created_for = other_user.id
          attachment.save
          attachment
        end

        before do
          get '/api/v1/third_party_apps/token', params: { appID: tpa.id.to_s, attID: attachment.id.to_s }
        end

        it 'status code is 403' do
          expect(response).to have_http_status :forbidden
        end
      end
    end
  end

  describe 'POST /api/v1/public/third_party_apps/{token}' do
    let(:user) { create(:person) }
    let(:other_user) { create(:person) }
    let!(:attachment) { create(:attachment, :with_image, storage: 'tmp', created_by: user.id, created_for: user.id) }
    let(:params_token) do
      {
        attID: attachment.id,
        userID: user.id,
        nameThirdPartyApp: 'fakeUpload',
      }
    end

    let(:payload) do
      { attID: params_token[:attID],
        userID: params_token[:userID],
        nameThirdPartyApp: params_token[:nameThirdPartyApp],
        appID: third_party_app.id }
    end

    let(:third_party_app) { create(:third_party_app) }
    let(:cache) { ActiveSupport::Cache::FileStore.new('tmp/ThirdPartyApp', expires_in: 1.hour) }
    let(:cache_key) { "#{attachment.id}/#{user.id}/#{third_party_app.id}" }
    let(:secret) { Rails.application.secrets.secret_key_base }
    let(:token) { JWT.encode(payload, secret, 'HS256') }
    let(:allowed_uploads) { 1 }
    let(:file_produced_by_3pa) do
      file_path = 'spec/fixtures/upload.jpg'
      Rack::Test::UploadedFile.new(file_path, 'spec/fixtures/upload.jpg')
    end
    let(:params) { { token: token, attachmentName: 'attachment_of_3pa', file: file_produced_by_3pa, fileType: '.csv' } }
    let(:collection) { create(:collection, user: user) }

    context 'when user is allowed to upload file' do
      context 'when attachment is directly linked to researchplan' do
        let!(:research_plan) do
          create(:research_plan, creator: user, collections: [collection], attachments: [attachment])
        end

        before do
          cache.write(cache_key, { token: token, upload: allowed_uploads }, expires_in: 1.hour)
          post "/api/v1/public/third_party_apps/#{token}", params: params
        end

        it 'upload a file' do
          expect(response.body).to include('File uploaded successfully')
        end

        it 'status code is 201' do
          expect(response).to have_http_status :created
        end

        it 'thumbnail was generated' do
          expect(Attachment.find_by(filename: 'attachment_of_3pa').thumb).to be true
        end
      end

      context 'when attachment is in a dataset of the researchplan' do
        let!(:research_plan) do
          create(:research_plan, creator: user, collections: [collection], container: root_container)
        end
        let(:root_container) do
          container = create(:container, :with_jpg_in_dataset)
          container.children.first.children.first.children.first.attachments.drop(1)
          container.children.first.children.first.children.first.attachments.push(attachment)
          container
        end

        before do
          cache.write(cache_key, { token: token, upload: allowed_uploads }, expires_in: 1.hour)
          post "/api/v1/public/third_party_apps/#{token}", params: params
        end

        it 'upload a file' do
          expect(response.body).to include('File uploaded successfully')
        end

        it 'status code is 201' do
          expect(response).to have_http_status :created
        end

        it 'thumbnail was generated' do
          expect(Attachment.find_by(filename: 'attachment_of_3pa').thumb).to be true
        end
      end
    end

    context 'when user is not allowed to upload file' do
      let(:inaccessible_collection) { create(:collection, user: other_user) }
      let(:attachment) do
        create(:attachment, :with_image, storage: 'tmp', created_by: user.id, created_for: user.id)
      end

      context 'when attachment is directly linked to researchplan' do
        let!(:research_plan) do
          create(:research_plan, creator: admin1, collections: [inaccessible_collection], attachments: [attachment])
        end

        before do
          cache.write(cache_key, { token: token, upload: allowed_uploads }, expires_in: 1.hour)
          post "/api/v1/public/third_party_apps/#{token}", params: params
        end

        it 'status code is 403' do
          expect(response).to have_http_status :forbidden
        end
      end

      # TODO: check if this spec does what it is supposed to do. I "fixed" it by setting the collection to another user,
      #       i.e. blocking write access due to the attachment being in an inaccessible collection.
      #       I have no idea why the context above did this explicitly before, but not this context here
      context 'when attachment is in a dataset of the researchplan' do
        let(:collection) { create(:collection, user: other_user) }
        let!(:research_plan) do
          create(:research_plan, creator: admin1, collections: [collection], container: root_container)
        end
        let(:root_container) do
          container = create(:container, :with_jpg_in_dataset)
          container.children.first.children.first.children.first.attachments.drop(1)
          container.children.first.children.first.children.first.attachments.push(attachment)
          container
        end

        before do
          cache.write(cache_key, { token: token, upload: allowed_uploads }, expires_in: 1.hour)
          post "/api/v1/public/third_party_apps/#{token}", params: params
        end

        it 'status code is 403' do
          expect(response).to have_http_status :forbidden
        end
      end

      context 'when amount of uploads exceeded' do
        let(:allowed_uploads) { -1 }

        before do
          cache.write(cache_key, { token: token, upload: allowed_uploads }, expires_in: 1.hour)
          allow_any_instance_of(Chemotion::ThirdPartyAppAPI::AttachmentHelpers).to receive(:read_access?).and_return(true)
          post "/api/v1/public/third_party_apps/#{token}", params: params
        end

        it 'status code is 403' do
          expect(response).to have_http_status :forbidden
        end
      end
    end
  end

  describe 'GET /api/v1/public/third_party_apps/{token}' do
    let(:token) do
      parts = CGI.unescape(JSON.parse(response.body))
      parts.split('/').last
    end

    let(:tpa) { create((:third_party_app)) }

    let!(:research_plan) do
      create(:research_plan, creator: admin1, collections: [collection], attachments: [attachment])
    end
    let(:attachment) { create(:attachment, created_for: admin1.id) }

    let(:attachment_size) { attachment.attachment_data['metadata']['size'] }
    let(:collection) { create(:collection, user: admin1) }

    context 'when user is allowed to upload attachment' do
      before do
        get '/api/v1/third_party_apps/token', params: { appID: tpa.id.to_s, attID: attachment.id.to_s }
        get "/api/v1/public/third_party_apps/#{token}"
      end

      it 'status of get request 200?' do
        expect(response).to have_http_status(:ok)
      end

      it 'recieved attachment size is correct' do
        expect(response.header['Content-Length'].to_i).to be attachment_size
      end
    end

    context 'when user is not allowed to upload attachment' do
      before do
        get '/api/v1/third_party_apps/token', params: { appID: tpa.id.to_s, attID: attachment.id.to_s }
        research_plan.collections = []
        research_plan.save
        get "/api/v1/public/third_party_apps/#{token}"
      end

      it 'status of get request 403?' do
        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  describe 'reaction-variations TPA flow' do
    let(:collection) { create(:collection, user: admin1) }
    let(:tpa) { create(:third_party_app, name: 'OpenStats') }
    let(:starting_material) { create(:valid_sample) }
    let(:reaction) do
      create(
        :reaction_with_variations,
        creator: admin1,
        collections: [collection],
        starting_materials: [starting_material],
        reactants: [create(:valid_sample)],
        products: [create(:valid_sample)],
        solvents: [create(:valid_sample)],
      ).reload
    end
    let(:variation_uuids) { reaction.variations.map { |variation| variation['uuid'] } }
    let(:cache) { ActiveSupport::Cache::FileStore.new('tmp/ThirdPartyApp', expires_in: 1.hour) }

    # The token endpoint returns a JSON-encoded URL "<app.url>?url=<escaped>&method=...".
    # Pull the escaped public-endpoint URL back out and take its last path segment (the JWT).
    def token_from(json_url)
      escaped = json_url[/url=([^&]+)/, 1]
      CGI.unescape(escaped).split('/').last
    end

    describe 'GET /api/v1/third_party_apps/variations_token' do
      let(:body) { JSON.parse(response.body) }
      let(:token) { token_from(body) }
      let(:payload) { JsonWebToken.decode(token) }

      context 'when the user may read the reaction' do
        before do
          get '/api/v1/third_party_apps/variations_token',
              params: {
                reactionID: reaction.id, appID: tpa.id,
                variationUuids: variation_uuids, columnOrder: %w[a b]
              }
        end

        it 'status of get request 200?' do
          expect(response).to have_http_status(:ok)
        end

        it 'points at the OpenStats app with the VariationStatistics method' do
          expect(body).to start_with("#{tpa.url}?url=")
          expect(body).to end_with('&method=VariationStatistics')
        end

        it 'encodes the request context into the token payload' do
          expect(payload['reactionID']).to eq reaction.id
          expect(payload['userID']).to eq admin1.id
          expect(payload['appID']).to eq tpa.id
          expect(payload['variationUuids']).to match_array(variation_uuids)
          expect(payload['columnOrder']).to eq %w[a b]
          expect(payload['requestID']).to be_present
        end
      end

      context 'when the user may not read the reaction' do
        let(:collection) { create(:collection, user: create(:person)) }

        before do
          get '/api/v1/third_party_apps/variations_token',
              params: { reactionID: reaction.id, appID: tpa.id, variationUuids: variation_uuids }
        end

        it 'status code is 403' do
          expect(response).to have_http_status(:forbidden)
        end
      end
    end

    describe 'GET /api/v1/public/third_party_app_variations/{token}' do
      let(:sent_uuids) { variation_uuids }
      let(:token) { token_from(JSON.parse(response.body)) }
      let(:request_id) { JsonWebToken.decode(token)['requestID'] }
      let(:cache_key) { "reaction/#{reaction.id}/#{admin1.id}/#{tpa.id}/#{request_id}" }
      let(:body) { JSON.parse(response.body) }

      before do
        get '/api/v1/third_party_apps/variations_token',
            params: { reactionID: reaction.id, appID: tpa.id, variationUuids: sent_uuids, columnOrder: %w[a b] }
      end

      context 'when all variations are requested' do
        before { get "/api/v1/public/third_party_app_variations/#{token}" }

        it 'status of get request 200?' do
          expect(response).to have_http_status(:ok)
        end

        it 'returns the identity envelope alongside the variations' do
          expect(body.keys).to match_array(%w[id request_id columnOrder variations])
          expect(body['id']).to eq reaction.id.to_s
          expect(body['request_id']).to eq request_id
          expect(body['columnOrder']).to eq %w[a b]
        end

        it 'returns every requested variation' do
          expect(body['variations'].length).to eq variation_uuids.length
        end

        it 'annotates each material with its human-readable name and short label' do
          aux = body['variations'].first['startingMaterials'].values.first['aux']
          expect(aux['shortLabel']).to eq starting_material.short_label
          expect(aux['name']).to eq(starting_material.preferred_label.presence || starting_material.short_label)
        end

        it 'decrements the download counter' do
          expect(cache.read(cache_key)[:download]).to eq 2
        end
      end

      context 'when only a subset of variations is requested' do
        let(:sent_uuids) { [variation_uuids.first] }

        before { get "/api/v1/public/third_party_app_variations/#{token}" }

        it 'returns only the requested variation' do
          expect(body['variations'].length).to eq 1
        end
      end

      context 'when the download counter is exhausted' do
        before do
          cache.write(cache_key, { token: token, download: -1 })
          get "/api/v1/public/third_party_app_variations/#{token}"
        end

        it 'status code is 403' do
          expect(response).to have_http_status(:forbidden)
        end
      end

      context 'when read access is revoked after minting the token' do
        before do
          reaction.collections = []
          reaction.save
          get "/api/v1/public/third_party_app_variations/#{token}"
        end

        it 'status code is 403' do
          expect(response).to have_http_status(:forbidden)
        end
      end
    end

    describe 'POST /api/v1/public/third_party_app_variations/{token}' do
      let(:request_id) { SecureRandom.uuid }
      let(:payload) do
        {
          'appID' => tpa.id,
          'userID' => admin1.id,
          'reactionID' => reaction.id,
          'variationUuids' => variation_uuids,
          'columnOrder' => [],
          'requestID' => request_id,
        }
      end
      let(:secret) { Rails.application.secrets.secret_key_base }
      let(:token) { JWT.encode(payload, secret, 'HS256') }
      let(:cache_key) { "reaction/#{reaction.id}/#{admin1.id}/#{tpa.id}/#{request_id}" }
      let(:upload_counter) { 10 }

      # OpenStats bundles the workbook, summary tables and plots into a single
      # result.zip under throwaway R tempfile names.
      let(:result_zip) do
        file = Tempfile.new(['tpa_result', '.zip'])
        file.close
        Zip::OutputStream.open(file.path) do |zip|
          zip.put_next_entry('tmp/RtmpAbc/workbook.xlsx')
          zip.write('fake-xlsx-bytes')
          zip.put_next_entry('tmp/RtmpAbc/summary.json')
          zip.write('{"id":"x","request_id":"y","element_info":[],"Output":[]}')
          zip.put_next_entry('tmp/RtmpAbc/plot.png')
          zip.write('fake-png-bytes')
        end
        file
      end
      let(:uploaded_file) { Rack::Test::UploadedFile.new(result_zip.path, 'application/zip') }
      let(:upload_params) { { file: uploaded_file } }

      before do
        cache.write(cache_key, { token: token, upload: upload_counter })
        allow(Message).to receive(:create_msg_notification)
        post "/api/v1/public/third_party_app_variations/#{token}", params: upload_params
      end

      context 'when the result is a valid zip and the user may write' do
        let(:analysis) do
          reaction.reload.container.analyses_container.children
                  .find { |child| child.name == 'Statistical Analysis' }
        end
        let(:dataset) { analysis.children.first }

        it 'status code is 201' do
          expect(response).to have_http_status(:created)
        end

        it 'creates a Statistical Analysis analysis on the reaction' do
          expect(analysis).to be_present
        end

        it 'attaches the workbook, summary and plot under stable filenames' do
          expect(dataset.attachments.map(&:filename)).to contain_exactly(
            'statistical_analysis.xlsx',
            'variations_summary.json',
            'variations_plot_1.png',
          )
        end

        it 'echoes the analysis id and request id' do
          expect(JSON.parse(response.body)).to include(
            'analysis_id' => analysis.id,
            'request_id' => request_id,
          )
        end

        it 'triggers the TPA attachment notification' do
          expect(Message).to have_received(:create_msg_notification)
            .with(hash_including(channel_subject: Channel::SEND_TPA_ATTACHMENT_NOTIFICATION))
        end
      end

      context 'when the echoed request_id does not match the token' do
        let(:upload_params) { { file: uploaded_file, request_id: 'not-the-request-id' } }

        it 'status code is 422' do
          expect(response).to have_http_status(:unprocessable_entity)
        end
      end

      context 'when the echoed id does not match the token' do
        let(:upload_params) { { file: uploaded_file, id: '0' } }

        it 'status code is 422' do
          expect(response).to have_http_status(:unprocessable_entity)
        end
      end

      context 'when the uploaded file is not a valid zip' do
        let(:uploaded_file) do
          file = Tempfile.new(['not_a_zip', '.zip'])
          file.write('this is plainly not a zip archive')
          file.rewind
          Rack::Test::UploadedFile.new(file.path, 'application/zip')
        end

        it 'status code is 422' do
          expect(response).to have_http_status(:unprocessable_entity)
        end
      end

      context 'when the user lacks access to the reaction' do
        let(:collection) { create(:collection, user: create(:person)) }

        it 'status code is 403' do
          expect(response).to have_http_status(:forbidden)
        end
      end

      context 'when the upload counter is exhausted' do
        let(:upload_counter) { -1 }

        it 'status code is 403' do
          expect(response).to have_http_status(:forbidden)
        end
      end

      context 'when no file is uploaded' do
        let(:upload_params) { {} }

        it 'status code is 400' do
          expect(response).to have_http_status(:bad_request)
        end
      end
    end
  end
end
# rubocop:enable RSpec/LetSetup,RSpec/MultipleExpectations,RSpec/NestedGroups,RSpec/MultipleMemoizedHelpers
