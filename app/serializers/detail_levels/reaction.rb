class DetailLevels::Reaction
  def base_attributes
    [
      :id, :type, :name, :created_at, :updated_at, :description,
      :timestamp_start, :timestamp_stop,
      :observation, :purification, :dangerous_products, :conditions, :solvent,
      :tlc_solvents, :tlc_description,
      :rf_value, :temperature, :status, :reaction_svg_file,
      :short_label, :container, :code_log, :role, :origin,
      :rinchi_long_key, :rinchi_web_key, :rinchi_short_key,
      :duration, :rxno, :can_copy, :can_update
    ]
  end

  def level0_attributes
    [
      :id, :type, :is_restricted, :observation, :description, :role, :can_copy, :can_update
    ]
  end

  def list_removed_attributes
    [
      :description, :timestamp_start, :timestamp_stop, :dangerous_products, :conditions,
      :observation, :purification, :solvent, :tlc_solvents, :tlc_description,
      :rf_value, :temperature, :container, :code_log, :duration, :purification_solvents, :can_copy, :can_update
    ]
  end

  def report_base_attributes
    [
      :temperature_display_with_unit, :literatures
    ]
  end
end
