class WellplateSerializer < ActiveModel::Serializer
  include Labeled

  attributes *DetailLevels::Wellplate.new.base_attributes

  has_many :wells

  def wells
    object.wells.order("id asc")
  end

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def type
    'wellplate'
  end

  class Level0 < ActiveModel::Serializer
    include WellplateLevelSerializable
    define_restricted_methods_for_level(0)

    def wells
      object.wells.order("id asc").map{ |s| WellSerializer::Level0.new(s, @nested_dl).serializable_hash }
    end
  end

  class Level1 < ActiveModel::Serializer
    include WellplateLevelSerializable
    define_restricted_methods_for_level(1)

    def wells
      object.wells.order("id asc").map{ |s| WellSerializer::Level1.new(s, @nested_dl).serializable_hash }
    end
  end
end

class WellplateSerializer::Level10 < WellplateSerializer
  alias_method :original_initialize, :initialize
  def initialize(element, nested_detail_levels)
    original_initialize(element)
    @nested_dl = nested_detail_levels
  end

  def wells
    object.wells.order("id asc").map{ |s| WellSerializer::Level10.new(s, @nested_dl).serializable_hash }
  end
end
