# frozen_string_literal: true

require 'rails_helper'

# The frontend talks JSON only to these Devise actions. HTML requests used to run
# the action and then call `super`, which ran the whole Devise action a second time.
RSpec.describe 'JSON-only Devise actions' do
  let(:user) { create(:person) }

  describe 'POST /users (sign up)' do
    let(:sign_up_params) do
      {
        user: {
          email: 'new-user@example.org', first_name: 'New', last_name: 'User', name_abbreviation: 'NUs',
          password: 'testtest', password_confirmation: 'testtest',
          affiliations_attributes: [{ country: 'Germany', organization: 'KIT' }]
        },
      }
    end

    it 'creates the user for a JSON request' do
      expect { post '/users', params: sign_up_params, as: :json }.to change(User, :count).by(1)
    end

    it 'rejects an HTML request without creating a user' do
      expect do
        expect { post '/users', params: sign_up_params }.to raise_error(ActionController::UnknownFormat)
      end.not_to change(User, :count)
    end
  end

  describe 'POST /users/password (reset instructions)' do
    it 'sends the instructions for a JSON request' do
      post '/users/password', params: { user: { email: user.email } }, as: :json

      expect(response).to have_http_status :ok
      expect(user.reload.reset_password_sent_at).to be_present
    end

    it 'rejects an HTML request without sending instructions' do
      expect do
        post '/users/password', params: { user: { email: user.email } }
      end.to raise_error(ActionController::UnknownFormat)

      expect(user.reload.reset_password_sent_at).to be_nil
    end
  end

  describe 'PUT /users/password (reset password)' do
    it 'rejects an HTML request without changing the password' do
      token = user.send_reset_password_instructions

      expect do
        put '/users/password', params: {
          user: { reset_password_token: token, password: 'changed123', password_confirmation: 'changed123' },
        }
      end.to raise_error(ActionController::UnknownFormat)

      expect(user.reload.valid_password?('testtest')).to be true
    end
  end

  describe 'POST /users/confirmation (resend confirmation)' do
    let(:user) { create(:person, confirmed_at: nil) }

    it 'rejects an HTML request without sending a mail' do
      expect do
        expect do
          post '/users/confirmation', params: { user: { email: user.email } }
        end.to raise_error(ActionController::UnknownFormat)
      end.not_to(change { user.reload.confirmation_sent_at })
    end
  end
end
