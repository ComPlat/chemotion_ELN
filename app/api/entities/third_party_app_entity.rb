# frozen_string_literal: true

module Entities
  class ThirdPartyAppEntity < Grape::Entity
    expose :ip_address
    expose :name
    expose :password
  end
end
