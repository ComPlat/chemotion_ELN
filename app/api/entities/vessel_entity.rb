module Entities
  class VesselEntity < Grape::Entity
    expose :id
    expose :name
    expose :description
    expose :vessel_template
  end
end