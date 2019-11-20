class DetailLevels::Screen
  def base_attributes
    [
      :id, :type, :name, :description, :result, :collaborator, :conditions,
      :requirements, :created_at, :updated_at, :code_log
    ]
  end

  def level0_attributes
    [
      :id, :type, :is_restricted, :name, :description, :conditions, :requirements
    ]
  end

  def list_removed_attributes
    [
      :code_log
    ]
  end
end
