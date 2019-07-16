class DetailLevels::ResearchPlan
  def base_attributes
    [
      :id, :type, :name, :body, :thumb_svg, :created_at, :updated_at
    ]
  end

  def level0_attributes
    base_attributes
  end

  def level1_attributes
    level0_attributes
  end
end
