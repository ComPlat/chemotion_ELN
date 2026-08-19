# frozen_string_literal: true

module Users
  class RegistrationsController < Devise::RegistrationsController
    before_action :check_otp, only: %i[destroy update]
    # authenticate_scope! now authenticates via Bearer token (see
    # JwtAuthenticatableStrategy), not the session cookie, so there's no
    # cookie-based state for CSRF to protect here in the first place - and
    # relying on it was actively harmful: a stale token used to trigger
    # Devise's handle_unverified_request -> sign_out_all_scopes on every
    # request, wiping the very auth we'd just established.
    skip_before_action :verify_authenticity_token, only: %i[update destroy]

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

    # PUT /resource
    # We need to use a copy of the resource because we don't want to change
    # the current user in place.
    def update
      self.resource = resource_class.to_adapter.get!(send(:"current_#{resource_name}").to_key)
      prev_unconfirmed_email = resource.unconfirmed_email if resource.respond_to?(:unconfirmed_email)

      resource_updated = update_resource(resource, account_update_params)
      yield resource if block_given?
      if resource_updated
        bypass_sign_in resource, scope: resource_name if sign_in_after_change_password?

        respond_to do |format|
          format.html { super }
          format.json do
            render json: { message: warden_messages(:updated, 'Your account has been updated successfully.') },
                   status: :ok
          end
        end
      else
        respond_to do |format|
          format.html { super }
          format.json do
            render json: { message: resource.errors.messages }, status: :bad_request
          end
        end
      end
    end

    # DELETE /resource
    def destroy
      resource.destroy
      Devise.sign_out_all_scopes ? sign_out : sign_out(resource_name)

      respond_to do |format|
        format.html { super }
        format.json do
          default_message = 'Bye! Your account has been successfully cancelled. We hope to see you again soon.'
          render json: { message: warden_messages(:destroyed, default_message) },
                 status: Devise.responder.redirect_status
        end
      end
    end


    protected

    # Overrides Devise::RegistrationsController#authenticate_scope!
    # Authentication via the Bearer token, so update/destroy work without any session or CSRF dependency.
    def authenticate_scope!
      warden.authenticate!(:jwt_authenticatable, scope: :user)
      self.resource = warden.user(scope: :user)
    end

    def check_otp
      return unless resource.otp_required_for_login &&
                    !resource.validate_and_consume_otp!(params[:user][:otp_attempt])

      resource.assign_attributes(account_update_params.except(:current_password))
      resource.errors.add(:base, :invalid_otp)
      render json: { otp_required: true, otp_wrong: params[:user][:otp_attempt].present? },
             status: :unprocessable_entity
    end

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

        respond_to do |format|
          format.html { super }
          format.json do
            token = Usecases::Authentication::BuildToken.by_user(resource)
            render json: { token: token, role: resource.type }, status: :ok
          end
        end
      else
        set_flash_message :notice, :"signed_up_but_#{resource.inactive_message}" if is_flashing_format?
        expire_data_after_sign_in!

        message = I18n.t(
          warden.message || :signed_up_but_inactive,
          scope: 'devise.registrations',
          resource_name: resource_name,
          default: 'Your account is inactive',
        )

        respond_to do |format|
          format.html { super }
          format.json do
            render json: { message: warden_messages(:signed_up_but_inactive, 'Your account is inactive') },
                   status: :accepted
          end
        end
      end
    end

    def resource_not_saved_handler
      clean_up_passwords resource
      @validatable = devise_mapping.validatable?
      @minimum_password_length = resource_class.password_length.min if @validatable

      respond_to do |format|
        format.html { super }
        format.json do
          render json: { error_messages: resource.errors.messages  }, status: 400
        end
      end
    end

    def warden_messages(key, default)
      I18n.t(
        warden.message || key,
        scope: 'devise.registrations',
        resource_name: resource_name,
        default: default,
      )
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
