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
    mole_molfile_or_no = ->(x) { x.molecule_molfile || no_structure }
    mols_rcts = starting_materials.map(&mole_molfile_or_no)
    mols_agts = reactants.map(&mole_molfile_or_no)
    mols_sols = solvents.map(&mole_molfile_or_no)
    mols_prds = products.map(&mole_molfile_or_no)

    [mols_rcts, mols_prds, (mols_agts + mols_sols)]
  end

  def no_structure
    <<-MOLFILE

  ACCLDraw04191619342D

  0  0  0  0  0  0  0  0  0  0999 V2000
M  END
    MOLFILE
  end
end
