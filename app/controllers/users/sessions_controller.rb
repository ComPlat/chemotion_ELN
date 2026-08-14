# frozen_string_literal: true

module Users
  class SessionsController < Devise::SessionsController
    def new
      @username = params[:login]
      @invalid = params[:invalid]
      super
    end

    # rubocop:disable Metrics/AbcSize
    def create
      login = params[:user][:login]
      password = params[:user][:password]
      requested_user = find_requested_user

      return render_otp_required if otp_required_for_user?(requested_user) &&
                                    requested_user.valid_password?(password)

      respond_to do |format|
        format.html { super }
        format.json do
          # always run warden.authenticate to count failed_attempts and lock user if too many attempts
          # add strategy name to avoid double count because User model declares
          # `:database_authenticatable` and `:two_factor_authenticatable`, so warden.authenticate tries both strategies
          self.resource = warden.authenticate(:two_factor_authenticatable, auth_options)
          token = Usecases::Authentication::BuildToken.execute!(username: login, password: password)

          if resource.present? && token.present?
            # devise code
            sign_in(resource_name, resource)

            # custom chemotion code
            headers['Authorization'] = "Bearer #{token}"

            render json: { token: token, role: requested_user.type }, status: :ok
          else
            render json: { message: sign_in_error_message }, status: :bad_request
          end
        end
      end
    end
    # rubocop:enable Metrics/AbcSize

    def destroy
      Devise.sign_out_all_scopes ? sign_out : sign_out(resource_name)
      head :no_content
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

    def sign_in_error_message
      auth_keys = resource_class.authentication_keys
      auth_keys = auth_keys.keys if auth_keys.respond_to?(:keys)
      authentication_keys = auth_keys.map { |key| resource_class.human_attribute_name(key) }
                                     .join(I18n.t(:'support.array.words_connector'))

      I18n.t(
        warden.message || :unauthenticated,
        scope: 'devise.failure',
        resource_name: resource_name,
        authentication_keys: authentication_keys,
        default: 'Username or password incorrect.',
      )
    end
  end
end
