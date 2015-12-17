class WellSerializer < ActiveModel::Serializer
  attributes *DetailLevels::Well.new.base_attributes

  has_one :sample

  def position
    #wrap position_x and y to position object
    {x: object.position_x, y: object.position_y}
  end

  def type
    'well'
  end

  class Level0 < ActiveModel::Serializer
    include WellLevelSerializable
    define_restricted_methods_for_level(0)
  end

  class Level1 < ActiveModel::Serializer
    include WellLevelSerializable
    define_restricted_methods_for_level(1)
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
