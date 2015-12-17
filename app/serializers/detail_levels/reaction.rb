class DetailLevels::Reaction
  def base_attributes
    [
      :id, :type, :name, :created_at, :updated_at, :description, :timestamp_start, :timestamp_stop,
      :observation, :purification, :dangerous_products, :solvent, :tlc_solvents, :tlc_description,
      :rf_value, :temperature, :status, :reaction_svg_file, :analysis_kinds
    ]
  end

  def level0_attributes
    [
      :id, :type, :is_restricted, :observation, :description
    ]
  end
end
