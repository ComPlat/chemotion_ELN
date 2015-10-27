class WellSerializer < ActiveModel::Serializer
  attributes :id, :position, :readout, :additive, :type

  has_one :sample

  def position
    #wrap position_x and y to position object
    {x: object.position_x, y: object.position_y}
  end

  def type
    'well'
  end

  class Level0 < ActiveModel::Serializer
    attributes :id, :type, :position, :is_restricted

    has_one :sample

    def position
      #wrap position_x and y to position object
      {x: object.position_x, y: object.position_y}
    end
    
    def type
      'well'
    end

    def is_restricted
      true
    end
  end

  class Level1 < Level0
    attributes :readout
  end
end
