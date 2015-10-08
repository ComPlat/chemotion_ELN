class WellSerializer < ActiveModel::Serializer
  attributes :id, :position, :readout, :additive

  has_one :sample

  def position
    #wrap position_x and y to position object
    {x: object.position_x, y: object.position_y}
  end
end
