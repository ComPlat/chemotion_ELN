class DetailLevels::Well
  def base_attributes
    [
      :id, :position, :readouts, :additive, :type, :label, :color_code
    ]
  end

  def level0_attributes
    [
      :id, :type, :position, :is_restricted
    ]
  end

  def level1_attributes
    level0_attributes + [:readouts]
  end
end
