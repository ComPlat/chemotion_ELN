# frozen_string_literal: true

module Entities
  class ScifinderNCredentialEntity < ApplicationEntity
    expose(
      :id,
      :access_token,
      :refresh_token,
      :expires_at,
      :updated_at,
    )
  end
end
