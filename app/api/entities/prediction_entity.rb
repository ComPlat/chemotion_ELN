module Entities
  class PredictionEntity < Grape::Entity
    expose :id, :predictable_id, :decision
  end
end
