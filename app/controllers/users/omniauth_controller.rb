# frozen_string_literal: true

module Users
  class OmniauthController < Devise::OmniauthCallbacksController
    PROVIDER_GITHUB = 'github'

    def github
      auth_handler
    end

    def orcid
      auth_handler
    end

    def openid_connect
      auth_handler
    end

    def shibboleth
      auth_handler
    end

    protected

    def auth
      request.env['omniauth.auth']
    end

    def first_name
      if auth&.provider == PROVIDER_GITHUB
        auth&.info&.name.split[0..-2].join(' ')
      else
        auth&.info&.first_name
      end
    end

    def last_name
      if auth&.provider == PROVIDER_GITHUB
        name.split&.last
      else
        auth&.info&.last_name
      end
    end

    def email
      auth&.info&.email
    end

    def groups
      entitlements = auth.extra.raw_info.entitlements
      entitlements&.map do |str|
        match = str.match(/(group:[^#]+)/)
        match[1] if match
      end
    rescue StandardError => e
      Rails.logger.error(e.message)
      Rails.logger.error(e.backtrace.join("\n"))
      []
    end

    def affiliation
      {}
      # affiliation['organization'] = Swot.school_name(email)
    end

    def name_abbreviation
      (first_name&.first || '') + (last_name&.first || '')
    end

    def providers
      provider = {}
      provider[auth.provider] = auth.uid
      provider
    end

    def auth_signup
      params = {
        email: email,
        uid: auth.uid,
        provider: auth.provider,
        first_name: first_name,
        last_name: last_name,
        name_abbreviation: name_abbreviation,
        groups: groups,
      }
      @user = User.from_omniauth(params)
      if @user.persisted?
        sign_in_and_redirect @user, event: :authentication
      else
        session_handler
        redirect_to new_user_registration_url
      end
    end

    def session_handler
      session['devise.omniauth.data'] = {
        provider: auth.provider,
        uid: auth.uid,
        email: email,
        first_name: first_name,
        last_name: last_name,
        name_abbreviation: name_abbreviation,
        affiliation: affiliation,
      }
    end

    def auth_handler
      if user_signed_in?
        current_user.link_omniauth(auth.provider, auth.uid)
        redirect_to root_path
      else
        auth_signup
      end
    end
  end
end
