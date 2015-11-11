class WellplateSerializer < ActiveModel::Serializer
  include Labeled

  attributes :id, :type, :size, :name, :description, :created_at, :updated_at

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
    attributes :id, :type, :size, :is_restricted

    has_many :wells

    alias_method :original_initialize, :initialize

    def initialize(element, nested_detail_levels)
      original_initialize(element)
      @nested_dl = nested_detail_levels
    end

    def is_restricted
      true
    end

    # Wellplate Lvl 10, Sample Lvl 1
    def type
      'wellplate'
    end

    def wells
      object.wells.order("id asc").map{ |s| WellSerializer::Level0.new(s, @nested_dl).serializable_hash }
    end
  end

  class Level1 < Level0
    has_many :wells, serializer: WellSerializer::Level1
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
