# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'CSRF protection of the Devise controllers' do
  include_context 'with CSRF protection'

  let(:user) { create(:person) }

  describe 'session cookie' do
    it 'is HttpOnly and SameSite=Lax' do
      get '/home'

      session_cookie = response.headers['Set-Cookie'].to_s.split("\n").find { |c| c.start_with?('_chemotion_session=') }
      expect(session_cookie).to match(/;\s*HttpOnly/i)
      expect(session_cookie).to match(/;\s*SameSite=Lax/i)
    end
  end

  describe 'sign in' do
    it 'is rejected without a CSRF token' do
      post '/users/sign_in', params: { user: { login: user.name_abbreviation, password: 'testtest' } }, as: :json

      expect(response).to have_http_status :unprocessable_entity
      expect(parsed_json_response).to eq('error' => 'invalid_authenticity_token')
    end

    it 'rotates the token and sends the new one in the X-CSRF-Token header' do
      page_token = fetch_csrf_token
      new_token = sign_in_with_csrf(user)

      expect(new_token).to be_present
      expect(new_token).not_to eq(page_token)
    end
  end

  describe 'DELETE /users (account deletion)' do
    it 'deletes the account with the token from the sign in response' do
      token = sign_in_with_csrf(user)

      delete '/users', headers: { 'X-CSRF-Token' => token }, as: :json

      expect(User.find_by(id: user.id)).to be_nil
    end

    it 'keeps the account without a CSRF token' do
      sign_in_with_csrf(user)

      delete '/users', as: :json

      expect(response).to have_http_status :unprocessable_entity
      expect(User.find_by(id: user.id)).to be_present
    end

    # The token in the page is invalid after sign in. Before the fix the frontend kept
    # sending it, which is why CSRF had been switched off for update/destroy.
    it 'keeps the account with the stale token of the page loaded before sign in' do
      stale_token = fetch_csrf_token
      sign_in_with_csrf(user)

      delete '/users', headers: { 'X-CSRF-Token' => stale_token }, as: :json

      expect(response).to have_http_status :unprocessable_entity
      expect(User.find_by(id: user.id)).to be_present
    end

    # What a foreign page can send: a plain form post, no custom headers.
    it 'keeps the account for a cross-site form post to /users.json' do
      sign_in_with_csrf(user)

      post '/users.json', params: { _method: 'delete' }

      expect(response).to have_http_status :unprocessable_entity
      expect(User.find_by(id: user.id)).to be_present
    end

    it 'keeps the account for an HTML request even with a valid token' do
      token = sign_in_with_csrf(user)

      expect do
        delete '/users', headers: { 'X-CSRF-Token' => token }
      end.to raise_error(ActionController::UnknownFormat)

      expect(User.find_by(id: user.id)).to be_present
    end
  end

  describe 'PUT /users (account update)' do
    let(:update_params) { { user: { email: 'new-mail@example.org', current_password: 'testtest' } } }

    it 'updates the account with the token from the sign in response' do
      token = sign_in_with_csrf(user)

      put '/users', params: update_params, headers: { 'X-CSRF-Token' => token }, as: :json

      expect(response).to have_http_status :ok
      expect(user.reload.unconfirmed_email).to eq('new-mail@example.org')
    end

    it 'does not update the account without a CSRF token' do
      sign_in_with_csrf(user)

      put '/users', params: update_params, as: :json

      expect(response).to have_http_status :unprocessable_entity
      expect(user.reload.unconfirmed_email).to be_nil
    end
  end

  describe 'DELETE /users/sign_out' do
    it 'signs out and hands out a fresh token for the next sign in' do
      token = sign_in_with_csrf(user)

      delete '/users/sign_out', headers: { 'X-CSRF-Token' => token }, as: :json
      expect(response).to have_http_status :no_content

      post '/users/sign_in',
           params: { user: { login: user.name_abbreviation, password: 'testtest' } },
           headers: { 'X-CSRF-Token' => csrf_token_from_response },
           as: :json
      expect(response).to have_http_status :ok
    end
  end
end
