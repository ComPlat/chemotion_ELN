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

    alias_method :original_initialize, :initialize
    def initialize(element, nested_detail_levels)
      original_initialize(element)
      @nested_dl = nested_detail_levels
    end

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

    def sample
      "SampleSerializer::Level#{@nested_dl[:sample]}".constantize.new(object.sample, @nested_dl).serializable_hash
    end
  end

  class Level1 < Level0
    attributes :readout
  end
end

class WellSerializer::Level10 < WellSerializer
  alias_method :original_initialize, :initialize
  def initialize(element, nested_detail_levels)
    original_initialize(element)
    @nested_dl = nested_detail_levels
  end

  def sample
    "SampleSerializer::Level#{@nested_dl[:sample]}".constantize.new(object.sample, @nested_dl).serializable_hash
  end
end
