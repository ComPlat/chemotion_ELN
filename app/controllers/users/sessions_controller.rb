# frozen_string_literal: true

module Users
  class SessionsController < Devise::SessionsController
    def new
      @username = params[:login]
      @invalid = params[:invalid]
      super
    end

    def create
      requested_user = find_requested_user

      return render_otp_required if otp_required_for_user?(requested_user) &&
                                    requested_user.valid_password?(params[:user][:password])

      super do |resource|
        # custom logic after successful login
        Rails.logger.info("Login success: #{resource.id}")
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
