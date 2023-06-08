# frozen_string_literal: true

module Entities
  # Publish-Subscription Entities
  class CellLineMaterialNameEntity < Grape::Entity
    expose :name
    expose :source
    expose :id
  end
end
