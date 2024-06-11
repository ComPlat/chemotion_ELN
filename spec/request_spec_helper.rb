# frozen_string_literal: true

module RequestSpecHelper
  def jwt_authorization_header(user)
    # Param `scp` is not in production requests. However warden-jwt_auth seems to not set the env.scope in test env
    # and raises `undefined method `to_sym' for nil:NilClass`. Don't know how to fix this otherwise.
    jwt = JWT.encode({ sub: user.id, jti: user.jti, scp: :user }, Rails.application.secrets.secret_key_base)

    { 'Authorization' => "Bearer #{jwt}" }
  end

  def content_type_header
    {
      'HTTP_ACCEPT' => 'application/json',
      'CONTENT_TYPE' => 'application/json',
    }
  end

  def authorized_header(user)
    content_type_header.merge(jwt_authorization_header(user))
  end

  def select_options
    Entities::ReactionProcessEditor::SelectOptions
  end
end
