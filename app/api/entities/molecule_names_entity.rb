module Entities
  class MoleculeNamesEntity < Grape::Entity
    expose :id, :molfile, :inchikey, :cano_smiles, :molecule_svg_file, :molecule_names
  end
end
