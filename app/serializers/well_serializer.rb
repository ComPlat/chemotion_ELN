class WellSerializer < ActiveModel::Serializer
  attributes :id, :position, :readout, :additive

  has_one :sample

  def position
    #wrap position_x and y to position object
    {x: object.position_x, y: object.position_y}
  end

  class BasePermissionSerializer < ActiveModel::Serializer
    attributes :id, :position, :is_restricted

    def is_restricted
      true
    end

    def position
      #wrap position_x and y to position object
      {x: object.position_x, y: object.position_y}
    end
  end

  class Level0 < BasePermissionSerializer
    has_one :sample, serializer: SampleSerializer::Level0
  end

  class Level1 < Level0
    has_one :sample, serializer: SampleSerializer::Level1
  end

  class Level2 < Level1
    attributes :readout
  end
end
