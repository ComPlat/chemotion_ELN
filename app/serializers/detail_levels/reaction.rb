class DetailLevels::Reaction
  def base_attributes
    [
      :id, :type, :name, :created_at, :updated_at, :description,
      :timestamp_start, :timestamp_stop,
      :observation, :purification, :dangerous_products, :solvent,
      :tlc_solvents, :tlc_description,
      :rf_value, :temperature, :status, :reaction_svg_file,
      :short_label, :container, :code_log, :role, :origin
    ]
  end

  def level0_attributes
    [
      :id, :type, :is_restricted, :observation, :description, :role
    ]
  end

  def list_removed_attributes
    [
      :description, :timestamp_start, :timestamp_stop, :dangerous_products,
      :observation, :purification, :solvent, :tlc_solvents, :tlc_description,
      :rf_value, :temperature, :container, :code_log
    ]
  end

  def report_base_attributes
    [
      :temperature_display_with_unit
    ]
  end
end
