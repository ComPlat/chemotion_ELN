# frozen_string_literal: true

module Entities
  class ScifinderNCredentialEntity < ApplicationEntity
    expose(
      :id,
      :access_token,
      :refresh_token
    )

    with_options(format_with: :eln_default) do
      expose :created_at
      expose :updated_at
    end
  end
end
