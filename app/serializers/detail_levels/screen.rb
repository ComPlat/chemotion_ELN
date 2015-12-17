class DetailLevels::Screen
  def base_attributes
    [
      :id, :type, :name, :description, :result, :collaborator, :conditions, :requirements, :created_at
    ]
  end

  def level0_attributes
    [
      :id, :type, :is_restricted, :name, :description, :conditions, :requirements
    ]
  end
end
