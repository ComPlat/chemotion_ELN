class DetailLevels::Sample
  def base_attributes
    [
      :id, :type, :name, :short_label, :description, :created_at,
      :target_amount_value, :target_amount_unit, :real_amount_value,
      :real_amount_unit, :molfile, :purity, :solvent, :impurities, :location,
      :is_top_secret, :is_restricted, :external_label, :analyses,
      :analysis_kinds, :children_count, :parent_id, :imported_readout, :_contains_residues,
<<<<<<< 3154e93ae6e0a848aae4f54c2942bae61a428b76
      :sample_svg_file, :density, :boiling_point, :melting_point, :reaction_description
=======
      :sample_svg_file, :density, :boiling_point, :melting_point, :container
>>>>>>> authorization, migrations to one migratio
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
    level1_attributes + [:analyses,:container] 
  end

  def level3_attributes
    level2_attributes
  end
end
