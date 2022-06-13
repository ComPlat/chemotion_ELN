class DetailLevels::Wellplate
  def base_attributes
    [
      :id, :type, :size, :name, :description, :created_at, :updated_at, :code_log, :short_label, :readout_titles
    ]
  end

  def level0_attributes
    [
      :id, :type, :size, :is_restricted
    ]
  end

  def level1_attributes
    level0_attributes
  end

  def list_removed_attributes
    [
      :code_log
    ]
  end
end
