# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Users::OmniauthController, type: :controller do
  # The :ldap omniauth route is registered only when the userProvider config enables it,
  # so append it on top of the real routes (rather than clobbering them with routes.draw,
  # which would break the devise mailer URL helpers used during user creation).
  before(:all) do # rubocop:disable RSpec/BeforeAfterAll
    Rails.application.routes.disable_clear_and_finalize = true
    Rails.application.routes.draw do
      devise_scope :user do
        get 'users/auth/ldap', to: 'users/omniauth#ldap'
      end
    end
    Rails.application.routes.disable_clear_and_finalize = false
  end

  after(:all) { Rails.application.reload_routes! } # rubocop:disable RSpec/BeforeAfterAll

  before do
    request.env['devise.mapping'] = Devise.mappings[:user]
    request.env['omniauth.auth'] = OmniAuth::AuthHash.new(
      provider: 'ldap',
      uid: 'jdoe',
      info: { email: 'jane.doe@bar.de', first_name: 'Jane', last_name: 'Doe' },
    )
  end

  describe 'GET #ldap' do
    context 'when the user does not exist yet' do
      it 'auto-creates the user' do
        expect { get :ldap }.to change(User, :count).by(1)
      end

      it 'provisions the user from the LDAP attributes and redirects' do
        get :ldap

        expect(User.find_by(email: 'jane.doe@bar.de')).to be_present
        expect(response).to be_redirect
      end
    end

    context 'when the user already exists' do
      let!(:existing) { create(:person, email: 'jane.doe@bar.de') }

      it 'reuses the existing user without creating a new one' do
        expect { get :ldap }.not_to change(User, :count)
        expect(response).to be_redirect
      end

      it 'links the ldap provider onto the existing user' do
        get :ldap

        expect(existing.reload.providers['ldap']).to eq('jdoe')
      end
    end

    context 'when already signed in' do
      let(:current) { create(:person) }

      before do
        allow(controller).to receive_messages(user_signed_in?: true, current_user: current)
      end

      it 'links the provider to the current user and redirects to root' do
        get :ldap

        expect(current.reload.providers['ldap']).to eq('jdoe')
        expect(response).to redirect_to(root_path)
      end
    end
  end
end
