module Users
  class SessionsController < Devise::SessionsController
    def new
      @username = params[:login]
      @invalid = params[:invalid]
      super
    end

    def create
      requested_user = User.where(name_abbreviation: params[:user][:login]).or(User.where(email: params[:user][:login])).take
      if requested_user&.valid_password?(params[:user][:password]) && requested_user.otp_required_for_login
        if params[:user][:otp_attempt].blank?
          render json: { otp_required: true }, status: :unauthorized
          return
        end

        unless requested_user.validate_and_consume_otp!(params[:user][:otp_attempt])
          render json: { otp_required: true, error: 'Invalid OTP' }, status: :unauthorized
          return
        end
      end

      super do |resource|
        # custom logic after successful login
        Rails.logger.info("Login success: #{resource.id}")
      end
    end
  end
end
