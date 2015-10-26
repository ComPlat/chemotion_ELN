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

    has_many :wells, serializer: WellSerializer::Level0

    def is_restricted
      true
    end

    def type
      'wellplate'
    end

    def wells
      object.wells.order("id asc")
    end
  end

  class Level1 < Level0
    has_many :wells, serializer: WellSerializer::Level1
  end
end
