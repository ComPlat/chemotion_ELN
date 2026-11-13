# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Users::Sessions' do
  describe 'POST /users/sign_in' do
    let(:user) { create(:person) }
    let(:password) { 'testtest' }
    let(:user_params) { { login: user.name_abbreviation, password: password } }

    def sign_in_json(params = user_params)
      post '/users/sign_in', params: { user: params }, as: :json
    end

    context 'with correct credentials' do
      it 'signs in and returns a token' do
        sign_in_json

        expect(response).to have_http_status :ok
        expect(parsed_json_response['token']).to be_present
        expect(response.headers['Authorization']).to eq("Bearer #{parsed_json_response['token']}")
      end
    end

    context 'with a wrong password' do
      let(:password) { 'wrong-password' }

      it 'responds 400' do
        sign_in_json

        expect(response).to have_http_status :bad_request
      end

      it 'counts the failed attempt exactly once' do
        expect { sign_in_json }.to change { user.reload.failed_attempts }.by(1)
      end
    end

    context 'when the account is locked' do
      before { user.lock_access!(send_instructions: false) }

      it 'does not sign in with the correct password' do
        sign_in_json

        expect(response).to have_http_status :bad_request
        expect(parsed_json_response).not_to have_key('token')
      end
    end

    context 'when the user has 2FA enabled' do
      before do
        user.update!(otp_secret: User.generate_otp_secret, otp_required_for_login: true)
      end

      it 'asks for an OTP when none is submitted' do
        sign_in_json

        expect(response).to have_http_status :unauthorized
        expect(parsed_json_response).to include('otp_required' => true, 'otp_wrong' => false)
      end

      it 'signs in with a correct OTP' do
        sign_in_json(user_params.merge(otp_attempt: user.current_otp))

        expect(response).to have_http_status :ok
        expect(parsed_json_response['token']).to be_present
      end

      it 'rejects a wrong OTP' do
        sign_in_json(user_params.merge(otp_attempt: '000000'))

        expect(response).to have_http_status :unauthorized
        expect(parsed_json_response).to include('otp_required' => true, 'otp_wrong' => true)
        expect(parsed_json_response).not_to have_key('token')
      end

      # Regression: an HTML request with a wrong OTP used to fall through to
      # Devise's default strategies, where :database_authenticatable signed
      # the user in with the password alone.
      it 'rejects an HTML request with a wrong OTP without signing in' do
        expect do
          post '/users/sign_in', params: { user: user_params.merge(otp_attempt: '000000') }
        end.to raise_error(ActionController::UnknownFormat)

        expect(user.reload.sign_in_count).to eq(0)
      end
    end
  end
end
