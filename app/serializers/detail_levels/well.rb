class DetailLevels::Well
  def base_attributes
    [
      :id, :position, :readout, :readouts, :additive, :type
    ]
  end

  def level0_attributes
    [
      :id, :type, :position, :is_restricted
    ]
  end

  def level1_attributes
    level0_attributes + [:readout, :readouts]
  end
end
