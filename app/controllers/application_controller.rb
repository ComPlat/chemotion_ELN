class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery if: -> { jwt_request? }
  protect_from_forgery with: :exception, unless: -> { jwt_request? }
  before_action :authenticate_user!, unless: -> { jwt_request? }
  before_action :authenticate_request, if: -> { jwt_request? }

  protect_from_forgery with: :null_session, if: Proc.new { |c| c.request.format == 'application/json' }

  before_action :configure_permitted_parameters, if: :devise_controller?

  protected

  def jwt_request?
    request.path.start_with?(
      '/api/v1/attachments_jwt'
    )
  end

  def authenticate_request
    @current_user = AuthorizeApiRequest.call(request.headers).result
    render json: { error: 'Not Authorized' }, status: 401 unless @current_user
  end

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [
      :email, :first_name, :last_name, :name_abbreviation, :omniauth_provider, :omniauth_uid,
      affiliations_attributes: [
        :country,
        :organization,
        :department,
        :group
      ],
    ])
    devise_parameter_sanitizer.permit(:sign_in) do |u|
      u.permit(:login, :password, :remember_me)
    end

    devise_parameter_sanitizer.permit(:account_update, keys: [
      :email
    ])
  end
end
