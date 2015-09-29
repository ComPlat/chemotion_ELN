class WellSerializer < ActiveModel::Serializer
  attributes :id, :position

  has_one :sample

  def position
    #wrap position_x and y to position object
    {x: object.position_x, y: object.position_y}
  end
end
