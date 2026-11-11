# frozen_string_literal: true

class ApplicationController < ActionController::Base
  # Verify the CSRF token on every non-GET request, regardless of format.
  # Must be declared only once: a second protect_from_forgery call replaces the
  # verify_authenticity_token callback instead of adding another one.
  # prepend: true runs the check before authenticate_user! and Devise's own callbacks.
  protect_from_forgery with: :exception, prepend: true
  before_action :authenticate_user!
  before_action :configure_permitted_parameters, if: :devise_controller?

  # Devise rotates the CSRF token on sign in/out (clean_up_csrf_token_on_authentication,
  # reset_session), which leaves the <meta name="csrf-token"> of the single page app stale.
  # Every response carries the current token; ChemotionApiClient picks it up.
  after_action :set_csrf_token_header

  rescue_from ActionController::InvalidAuthenticityToken, with: :invalid_authenticity_token

  protected

  def set_csrf_token_header
    response.set_header('X-CSRF-Token', form_authenticity_token)
  end

  def invalid_authenticity_token(exception)
    raise exception unless request.format.json?

    set_csrf_token_header
    render json: { error: 'invalid_authenticity_token' }, status: :unprocessable_entity
  end

  def ensure_json_request
    raise ActionController::UnknownFormat unless request.format.json?
  end

  def configure_permitted_parameters
    devise_parameter_sanitizer
      .permit(:sign_up, keys: [
                :email, :first_name, :last_name, :name_abbreviation, :provider, :uid,
                { affiliations_attributes: %i[
                  country
                  organization
                  department
                  group
                ] }
              ])
    devise_parameter_sanitizer.permit(:sign_in) do |u|
      u.permit(:login, :password, :remember_me)
    end

    devise_parameter_sanitizer.permit(:account_update, keys: %i[email otp_attempt])
  end
end
