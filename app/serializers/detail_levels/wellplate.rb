class DetailLevels::Wellplate
  def base_attributes
    [
      :id, :type, :size, :name, :description, :bar_code, :qr_code,
      :created_at, :updated_at
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
end
