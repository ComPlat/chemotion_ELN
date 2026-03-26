# frozen_string_literal: true

module Users
  class TwoFactorAuthController < ApplicationController
    before_action :decode_jwt, only: %i[request_enable request_disable verify]
    skip_before_action :authenticate_user!
    layout 'two_factor_auth'

    def request_enable
      @qr_code_svg = @user.generate_qr_code
      render :request_enable
    end

    def request_disable
      @user.otp_required_for_login = false
      @user.save!
      @header = I18n.t('two_factor_auth_controller.request_disable.header')
      @message = I18n.t('two_factor_auth_controller.request_disable.message')
      render :request_result
    end

    def verify
      if @user.check_otp(params[:code])# replace with real verification
        @user.otp_required_for_login = true
        @user.save!
        @header = I18n.t('two_factor_auth_controller.verify.header')
        @message = I18n.t('two_factor_auth_controller.verify.message')
      else
        @message = I18n.t('two_factor_auth_controller.verify.error_message')
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
          @header = I18n.t('two_factor_auth_controller.decode_jwt.error_header')
          @message = I18n.t('two_factor_auth_controller.decode_jwt.error_message_wrong_token')
          return render :request_result, status: :unauthorized
        end
        @user = User.find(@payload[:user_id])
        if @user.blank?
          @header = I18n.t('two_factor_auth_controller.decode_jwt.error_header')
          @message = I18n.t('two_factor_auth_controller.decode_jwt.error_message_wrong_token')
          return render :request_result, status: :unauthorized
        end
      rescue Errors::ExpiredSignature
        @header = I18n.t('two_factor_auth_controller.decode_jwt.error_header')
        @message = I18n.t('two_factor_auth_controller.decode_jwt.error_message_expired_token')
        render :request_result, status: :unauthorized
      rescue Errors::DecodeError
        @header = I18n.t('two_factor_auth_controller.decode_jwt.error_header')
        @message = I18n.t('two_factor_auth_controller.decode_jwt.error_message_no_token')
        render :request_result, status: :unauthorized
      end
    end
  end
end
