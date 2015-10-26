class WellplateSerializer < ActiveModel::Serializer
  include Labeled

  attributes :id, :type, :size, :name, :description, :created_at, :updated_at, :wells

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

  class BasePermissionSerializer < ActiveModel::Serializer
    attributes :id, :type, :is_restricted, :size

    def type
      'wellplate'
    end

    def is_restricted
      true
    end
  end

  class Level0 < BasePermissionSerializer
    has_many :wells, serializer: WellSerializer::Level0
  end

  class Level1 < Level0
    has_many :wells, serializer: WellSerializer::Level1
  end

  class Level2 < Level1
    has_many :wells, serializer: WellSerializer::Level2
  end
end
