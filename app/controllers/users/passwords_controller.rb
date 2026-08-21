# frozen_string_literal: true

module Users
  class PasswordsController < Devise::PasswordsController
    # POST /resource/password
    def create
      self.resource = resource_class.send_reset_password_instructions(resource_params)

      if successfully_sent?(resource)
        message = warden_message(
          :send_instructions,
          'You will receive an email with instructions on how to reset your password in a few minutes.',
        )

        respond_to do |format|
          format.html { super }
          format.json do
            render json: { message: message }, status: :ok
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

    # PUT /resource/password

    # rubocop:disable Metrics/AbcSize, Metrics/MethodLength
    def update
      self.resource = resource_class.reset_password_by_token(resource_params)

      if resource.errors.empty?
        resource.unlock_access! if unlockable?(resource)
        message_key = :updated_not_active
        token = nil

        if sign_in_after_reset_password?
          message_key = resource.active_for_authentication? ? :updated : :updated_not_active
          resource.after_database_authentication
          sign_in(resource_name, resource)
          token = Usecases::Authentication::BuildToken.by_user(resource) if message_key == :updated
        end

        default_message =
          if message_key == :updated
            'Your password has been changed successfully. You are now signed in.'
          else
            'Your password has been changed successfully.'
          end

        respond_to do |format|
          format.html { super }
          format.json do
            render json: {
              message: warden_message(message_key, default_message),
              token: token,
              role: resource.type,
            }, status: :ok
          end
        end
      else
        set_minimum_password_length

        respond_to do |format|
          format.html { super }
          format.json do
            render json: { message: resource.errors.messages }, status: :bad_request
          end
        end
      end
    end
    # rubocop:enable Metrics/AbcSize, Metrics/MethodLength

    protected

    def sign_in_after_reset_password?
      resource_class.sign_in_after_reset_password
    end

    def warden_message(key, default)
      I18n.t(
        warden.message || key,
        scope: 'devise.passwords',
        resource_name: resource_name,
        default: default,
      )
    end
  end
end
