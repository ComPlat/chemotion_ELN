class WellSerializer < ActiveModel::Serializer
  attributes :id, :position, :readout, :additive

  has_one :sample

  def readout
    object.readout
  end

  def additive
    object.additive
  end

  def position
    #wrap position_x and y to position object
    {x: object.position_x, y: object.position_y}
  end
end
