# frozen_string_literal: true

module Entities
  class ScifinderNCredentialEntity < ApplicationEntity
    expose(
      :id,
      :access_token,
      :refresh_token
    )

    expose_timestamps
  end
end
