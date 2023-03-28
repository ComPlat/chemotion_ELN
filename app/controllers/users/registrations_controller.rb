# frozen_string_literal: true

module Users
  class RegistrationsController < Devise::RegistrationsController
    def new
      build_resource({})
      @affiliation = resource.affiliations.build
      omniauth_handler if session['devise.omniauth.data']

      set_minimum_password_length
      yield resource if block_given?
      respond_with resource
    end

    def create
      build_resource(sign_up_params)
      find_affiliation
      default_password
      providers

      yield resource if block_given?
      if resource.save
        resource_saved_handler
      else
        resource_not_saved_handler
      end
    end

    protected

    def providers
      provider = {}
      provider[resource.provider] = resource.uid
      resource.providers = provider
    end

    def find_affiliation
      resource.affiliations = [Affiliation.find_or_create_by(resource.affiliations.first.slice(:country, :organization,
                                                                                               :department, :group))]
    end

    def default_password
      resource.password = Devise.friendly_token[0, 20] if resource.password.nil?
    end

    def resource_saved_handler
      if resource.active_for_authentication?
        set_flash_message :notice, :signed_up if is_flashing_format?
        sign_up(resource_name, resource)
        respond_with resource, location: after_sign_up_path_for(resource)
      else
        set_flash_message :notice, :"signed_up_but_#{resource.inactive_message}" if is_flashing_format?
        expire_data_after_sign_in!
        respond_with resource, location: after_inactive_sign_up_path_for(resource)
      end
    end

    def resource_not_saved_handler
      clean_up_passwords resource
      @validatable = devise_mapping.validatable?
      @minimum_password_length = resource_class.password_length.min if @validatable
      respond_with resource
    end

    def assign_email
      resource.email = (resource.email.presence || session['devise.omniauth.data']['email'])
    end

    def assign_name
      data = session['devise.omniauth.data'] || {}
      resource.first_name = (resource.first_name.presence || data['first_name'])
      resource.last_name = (resource.last_name.presence || data['last_name'])
      resource.name_abbreviation = (resource.name_abbreviation.presence || data['name_abbreviation'])
    end

    def omniauth_handler
      assign_email
      assign_name
      affiliation_handler
      provider_handler
      session.delete('devise.omniauth.data')
    end

    def provider_handler
      return if session['devise.omniauth.data']['provider'].blank?

      resource.provider = session['devise.omniauth.data']['provider']
      resource.uid = session['devise.omniauth.data']['uid']
    end

    def assign_affiliation(aff)
      return if aff.blank?

      aff.organization = (aff.organization.presence || data['affiliation']['organization'])
      aff.country = (aff.country.presence || data['affiliation']['country'])
      aff.department = (aff.department.presence || data['affiliation']['department-name'])
      aff
    end

    def affiliation_handler
      return if session['devise.omniauth.data']['affiliation'].blank?

      aff = assign_affiliation(resource.affiliations[0]) if resource.affiliations&.length.positive? # rubocop: disable Lint/SafeNavigationChain
      resource.affiliations[0] = aff if aff.present?
    end

    # GET /resource/edit
    # def edit
    #   super
    # end

    # PUT /resource
    # def update
    #   super
    # end

    # DELETE /resource
    # def destroy
    #   super
    # end

    # GET /resource/cancel
    # Forces the session data which is usually expired after sign
    # in to be expired now. This is useful if the user wants to
    # cancel oauth signing in/up in the middle of the process,
    # removing all OAuth session data.
    # def cancel
    #   super
    # end

    # protected

    # If you have extra params to permit, append them to the sanitizer.
    # def configure_sign_up_params
    #   devise_parameter_sanitizer.permit(:sign_up, keys: [:attribute])
    # end

    # If you have extra params to permit, append them to the sanitizer.
    # def configure_account_update_params
    #   devise_parameter_sanitizer.permit(:account_update, keys: [:attribute])
    # end

    # The path used after sign up.
    # def after_sign_up_path_for(resource)
    #   super(resource)
    # end

    # The path used after sign up for inactive accounts.
    # def after_inactive_sign_up_path_for(resource)
    #   super(resource)
    # end
  end
end
