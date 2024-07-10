# frozen_string_literal: true

module Entities
  class ThirdPartyAppEntity < Grape::Entity
    expose :ip_address
    expose :name
    expose :password
    expose :file_type
  end
end
