class DetailLevels::Sample
  def base_attributes
    [
      :id, :type, :name, :short_label, :description, :created_at, :target_amount_value, :target_amount_unit, :real_amount_value, :real_amount_unit, :molfile,
      :purity, :solvent, :impurities, :location, :is_top_secret, :is_restricted, :external_label, :analyses,
      :analysis_kinds, :children_count, :imported_readout, :contains_residues, :sample_svg_file
    ]
  end

  def level0_attributes
    [
      :id, :type, :is_restricted, :external_label
    ]
  end

  def level1_attributes
    level0_attributes + [:molfile]
  end

  def level2_attributes
    level1_attributes + [:analyses]
  end

  def level3_attributes
    level2_attributes
  end
end
