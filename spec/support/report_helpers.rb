module ReportHelpers
  def all_spl_settings
    {
      diagram: true,
      collection: true,
      analyses: true,
      reaction_description: true,
    }
  end

  def all_rxn_settings
    {
      diagram: true,
      material: true,
      description: true,
      purification: true,
      tlc: true,
      observation: true,
      analysis: true,
      literature: true,
    }
  end

  def all_configs
    {
      page_break: true,
      whole_diagram: true,
    }
  end
end
