class Users::RegistrationsController < Devise::RegistrationsController
# before_action :configure_sign_up_params, only: [:create]
# before_action :configure_account_update_params, only: [:update]

  # GET /resource/sign_up
  # def new
  #   super
  # end

  def new
    build_resource({})

    @affiliation = resource.affiliations.build

    # try to get the data from the oauth provider from the session
    if data = session['devise.omniauth.data']
      resource.email = data['email'] if resource.email.blank?
      resource.first_name = data['first_name'] if resource.first_name.blank?
      resource.last_name = data['last_name'] if resource.last_name.blank?

      if data['affiliation']
        resource.affiliations[0].organization = data['affiliation']['organization'] if resource.affiliations[0].organization.blank?
        resource.affiliations[0].country = data['affiliation']['country'] if resource.affiliations[0].country.blank?
        resource.affiliations[0].department = data['affiliation']['department-name'] if resource.affiliations[0].department.blank?
      end

      resource.omniauth_provider = data['provider']
      resource.omniauth_uid = data['uid']

      # delete the entry in the session
      session.delete('devise.omniauth.data')
    end

    set_minimum_password_length
    yield resource if block_given?
    respond_with self.resource
  end

  # POST /resource
  def create
    build_resource(sign_up_params)
    resource.affiliations = [Affiliation.find_or_create_by(resource.affiliations.first.slice(:country, :organization, :department, :group))]

    if resource.password.nil?
      resource.password = Devise.friendly_token[0,20]
    end

    resource_saved = resource.save
    yield resource if block_given?
    if resource_saved
      if resource.active_for_authentication?
        set_flash_message :notice, :signed_up if is_flashing_format?
        sign_up(resource_name, resource)
        respond_with resource, location: after_sign_up_path_for(resource)
      else
        set_flash_message :notice, :"signed_up_but_#{resource.inactive_message}" if is_flashing_format?
        expire_data_after_sign_in!
        respond_with resource, location: after_inactive_sign_up_path_for(resource)
      end
    else
      clean_up_passwords resource
      @validatable = devise_mapping.validatable?
      if @validatable
        @minimum_password_length = resource_class.password_length.min
      end
      respond_with resource
    end
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
