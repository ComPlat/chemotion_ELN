# frozen_string_literal: true

module Users
  class ConfirmationsController < Devise::ConfirmationsController
    # GET /resource/confirmation?confirmation_token=abcdef
    def show
      self.resource = resource_class.confirm_by_token(params[:confirmation_token])

      if resource.errors.empty?
        respond_with_navigational(resource) { redirect_to after_confirmation_path_for(resource_name, resource) }
      else
        redirect_to "/new_confirmation?confirmation_token=#{params[:confirmation_token]}"
      end
    end

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
  end
end
