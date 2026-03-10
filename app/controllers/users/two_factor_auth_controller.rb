module Users
  class TwoFactorAuthController < ApplicationController
    before_action :decode_jwt, only: [:request_enable, :request_disable, :verify]
    skip_before_action :authenticate_user!
    layout "two_factor_auth"

    def request_enable
      @qr_code_svg = @user.generate_qr_code
      render :request_enable
    end

    def request_disable
      @user.otp_required_for_login = false
      @user.save!
      @header = 'Two-Factor Authentication disabled!'
      @message = 'Successfully disabled Two-Factor Authentication.'
      render :request_result
    end

    def verify
      if @user.check_otp(params[:code])# replace with real verification
        @user.otp_required_for_login = true
        @user.save!
        @header = 'Two-Factor Authentication activated!'
        @message = 'Successfully activated Two-Factor Authentication.'
      else
        @message = 'Code wrong!'
        return :request_enable
      end
      render :request_result
    end

    private

    def decode_jwt
      token = params[:jwt]

      begin
        @payload = JsonWebToken.decode(token)
        if @payload[:action] != 'activate_2fa'
          @header = 'Two-Factor Authentication failed'
          @message = 'Token is a TFA token!'
          return render :request_result, status: :unauthorized
        end
        @user = User.find(@payload[:user_id])
        if @user.blank?
          @header = 'Two-Factor Authentication failed'
          @message = 'Token is a TFA token!'
          return render :request_result, status: :unauthorized
        end
      rescue Errors::ExpiredSignature
        @header = 'Two-Factor Authentication failed!'
        @message = 'Token expired! please request a new token!'
        render :request_result, status: :unauthorized
      rescue Errors::DecodeError
        @header = 'Two-Factor Authentication failed'
        @message = 'Token is not valid!'
        render :request_result, status: :unauthorized
      end
    end
  end
end
