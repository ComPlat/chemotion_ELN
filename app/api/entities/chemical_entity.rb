# frozen_string_literal: true

module Entities
  # Publish-Subscription Entities
  class ChemicalEntity < Grape::Entity
    expose :id, :sample_id, :cas
  end
end
