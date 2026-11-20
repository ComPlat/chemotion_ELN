# frozen_string_literal: true

# Shared access checks for the LLM endpoints. The frontend hides what a user may
# not do; these are the server-side backstops behind it.
module LlmAccessHelpers
  extend Grape::API::Helpers

  # The aiUserApiKey gate. Naming an endpoint, a model or a key in a request is
  # configuring a personal provider, whether or not a record is saved.
  def ensure_personal_providers_allowed!
    return if LlmProviderResolver.user_api_key_allowed?(current_user)

    error!({ error: 'You are not permitted to configure your own AI provider. Contact your administrator.' },
           403)
  end
end
