# frozen_string_literal: true

# Module for tag behaviour
module ReactionRinchi
  extend ActiveSupport::Concern

  included do
    before_save :generate_rinchis
  end

  def generate_rinchis
    self.rinchi_string, self.rinchi_long_key,
      self.rinchi_short_key, self.rinchi_web_key = invoke_rinchis
  end

  def invoke_rinchis
    mols_rcts, mols_prds, mols_agts = retrieve_molfiles

    rcts = Rinchi::MolVect.new
    mols_rcts.each do |rct| rcts.push(rct) end
    prds = Rinchi::MolVect.new
    mols_prds.each do |prd| prds.push(prd) end
    agts = Rinchi::MolVect.new
    mols_agts.each do |agt| agts.push(agt) end

    Rinchi.convert(rcts, prds, agts)
  end

  def retrieve_molfiles
    [starting_materials, final_products, reactants + solvents].map do |materials|
      materials.map { |material| molfile_for(material) }
    end
  end

  def molfile_for(material)
    molfile = material.molecule_molfile || no_structure
    match = material.molecule&.molfile_version&.match(/^(V2000).*T9/)
    match ? Chemotion::OpenBabelService.mofile_clear_coord_bonds(molfile, match[1]) : molfile
  end

  def final_products
    return products unless persisted?

    carried_ids = ReactionsProductSample.where(reaction_id: id, carry_on: true).pluck(:sample_id)
    products.reject { |product| carried_ids.include?(product.id) }
  end

  def no_structure
    <<~MOLFILE
    
      ACCLDraw04191619342D
    
      0  0  0  0  0  0  0  0  0  0999 V2000
    M  END
    MOLFILE
  end
end
