# frozen_string_literal: true

module Users
  class SessionsController < Devise::SessionsController
    def new
      @username = params[:login]
      @invalid = params[:invalid]
      super
    end

    def create
      login = params[:user][:login]
      password = params[:user][:password]
      requested_user = find_requested_user

      return render_otp_required if otp_required_for_user?(requested_user) &&
                                    requested_user.valid_password?(password)

      respond_to do |format|
        format.html { super }
        format.json do
          token = Usecases::Authentication::BuildToken.execute!(username: login, password: password)
          if token.present?
            # devise code
            self.resource = warden.authenticate!(auth_options)
            set_flash_message!(:notice, :signed_in)
            sign_in(resource_name, resource)

            # custom chemotion code
            headers["Authorization"] = "Bearer #{token}"

            render json: { token: token, role: requested_user.type }, status: :ok
          else
            render json: { message: 'Username or password incorrect.' }, status: :bad_request
          end
        end
      end
    end

    private

    def otp_required_for_user?(user)
      user&.otp_required_for_login && otp_missing_or_invalid?(user)
    end

    def find_requested_user
      User.where(name_abbreviation: params[:user][:login])
          .or(User.where(email: params[:user][:login]))
          .take
    end

    def otp_missing_or_invalid?(user)
      otp_attempt = params[:user][:otp_attempt]

      # OTP missing
      return true if otp_attempt.blank?

      # OTP invalid
      return true unless user.validate_and_consume_otp!(otp_attempt)

      false
    end

    def render_otp_required(error: nil)
      response = { otp_required: true, otp_wrong: params[:user][:otp_attempt].present? }
      response[:error] = error if error
      render json: response, status: :unauthorized
    end
  end
end
