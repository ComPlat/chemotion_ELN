class WellplateSerializer < ActiveModel::Serializer
  include Labeled

  attributes :id, :type, :size, :name, :description, :created_at, :wells

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
end
