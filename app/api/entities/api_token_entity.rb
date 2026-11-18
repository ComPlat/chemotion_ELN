# frozen_string_literal: true

module Entities
  class ApiTokenEntity < Grape::Entity
    expose :id
    expose :name
    expose :expires_at do |token|
      token.expires_at&.to_i
    end

    expose :revoked do |token|
      token.revoked_at.present?
    end
  end
end
