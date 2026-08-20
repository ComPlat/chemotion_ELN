# frozen_string_literal: true

module Users
  class ConfirmationsController < Devise::ConfirmationsController
    # POST /resource/confirmation
    def create
      self.resource = resource_class.send_confirmation_instructions(resource_params)

      if successfully_sent?(resource)
        message = I18n.t(
          warden.message || :send_instructions,
          scope: 'devise.confirmations',
          resource_name: resource_name,
          default:
            'You will receive an email with instructions for how to confirm your email address in a few minutes.',
        )
        render json: { message: message }, status: :ok
      else
        respond_to do |format|
          format.html { super }
          format.json do
            render json: { message: resource.errors.messages }, status: :bad_request
          end
        end
      end
    end
  end
end
