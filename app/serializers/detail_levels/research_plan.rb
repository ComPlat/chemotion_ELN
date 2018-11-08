class DetailLevels::ResearchPlan
  def base_attributes
    [
      :id, :type, :name, :description, :sdf_file, :svg_file, :attachments
    ]
  end

  def level0_attributes
    base_attributes
  end

  def level1_attributes
    level0_attributes
  end
end
