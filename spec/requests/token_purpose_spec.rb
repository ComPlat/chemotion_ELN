# frozen_string_literal: true

require 'rails_helper'

# All JSON web tokens are signed with the same secret. These specs make sure a
# token is only accepted where it was issued for, and that only login tokens
# log a user in.
RSpec.describe 'JSON web token purposes' do
  let(:user) { create(:person) }

  def token_for(purpose, payload = { user_id: user.id })
    JsonWebToken.encode(payload, 1.day.from_now, purpose: purpose)
  end

  def bearer(token)
    { 'Authorization' => "Bearer #{token}" }
  end

  describe 'Grape API' do
    it 'accepts a login token' do
      get '/api/v1/users/current', headers: bearer(token_for(:login))

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig('user', 'id')).to eq(user.id)
    end

    %i[editor two_factor_auth third_party_app].each do |purpose|
      it "rejects a #{purpose} token as login" do
        get '/api/v1/users/current', headers: bearer(token_for(purpose))

        expect(response).to have_http_status(:unauthorized)
      end
    end

    it 'rejects a 2FA mail link token as login' do
      jwt = Rack::Utils.parse_query(URI(OtpWebToken.enable_link(user)).query)['jwt']

      get '/api/v1/users/current', headers: bearer(jwt)

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'Rails controllers' do
    it 'authenticates the request with a login token without creating a session' do
      get '/mydb', headers: bearer(token_for(:login))
      expect(response).to have_http_status(:ok)

      get '/api/v1/users/current'
      expect(response).to have_http_status(:unauthorized)
    end

    it 'does not log in with an editor token' do
      get '/mydb', headers: bearer(token_for(:editor))

      expect(response).not_to have_http_status(:ok)
    end
  end

  describe 'OnlyOffice download (GET /api/v1/public/download)' do
    let(:attachment) { create(:attachment, created_by: user.id) }
    let(:payload) { { att_id: attachment.id, user_id: user.id } }

    it 'accepts an editor token' do
      get '/api/v1/public/download', params: { token: token_for(:editor, payload) }

      expect(response).to have_http_status(:ok)
    end

    it 'rejects a login token' do
      get '/api/v1/public/download', params: { token: token_for(:login, payload) }

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'OnlyOffice callback (POST /api/v1/public/callback)' do
    let(:attachment) { create(:attachment, created_by: user.id) }
    let(:payload) { { att_id: attachment.id, user_id: user.id } }

    it 'rejects a login token' do
      post '/api/v1/public/callback', params: { key: token_for(:login, payload), status: 4 }

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'EditorAPI#start' do
    include_context 'api request authorization context'

    let(:attachment) { create(:attachment, created_by: user.id, filename: 'document.docx') }
    let(:claims) { JWT.decode(parsed_json_response['token'], nil, false).first }

    around do |example|
      original = Rails.configuration.editors
      Rails.configuration.editors = ActiveSupport::OrderedOptions.new.merge(
        docserver: { callback_server: 'http://eln.test' }, info: {},
      )
      example.run
    ensure
      Rails.configuration.editors = original
    end

    before do
      allow(Attachment).to receive(:find_by).and_return(attachment)
      allow(attachment).to receive(:editable_document?).and_return(true)
      allow_any_instance_of(AttachmentHelpers).to receive(:read_access?).and_return(true) # rubocop:disable RSpec/AnyInstance
      get "/api/v1/editor/#{attachment.id}/start"
    end

    it 'issues an editor token that expires after a day' do
      expect(claims['purpose']).to eq('editor')
      expect(claims['exp']).to be_within(5).of(1.day.from_now.to_i)
    end
  end

  describe '2FA mail link (GET /users/two_factor_auth/request_enable)' do
    it 'accepts the token from the mail' do
      get OtpWebToken.enable_link(user).sub(Rails.application.config.root_url.to_s, '')

      expect(response).to have_http_status(:ok)
    end

    it 'rejects a login token' do
      get '/users/two_factor_auth/request_enable', params: { jwt: token_for(:login) }

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
