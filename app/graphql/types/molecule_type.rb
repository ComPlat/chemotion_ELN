# frozen_string_literal: true

module Types
  class MoleculeType < Types::BaseObject
    field :inchikey, String, description: 'Inchikey of molecule'
    field :inchistring, String, description: 'Inchistring of molecule'
    field :density, Float, description: 'Density of molecule'
    field :molecular_weight, Float, description: 'Molecular weight of molecule'
    field :molfile, String, description: 'Molfile of molecule'
    field :melting_point, Float, description: 'Melting point weight of molecule'
    field :boiling_point, Float, description: 'Boiling point weight of molecule'
    field :sum_formular, String, description: 'Sum formular of molecule'
    field :names, [String], description: 'Names of molecule'
    field :iupac_name, String, description: 'Iupac name of molecule'
    field :molecule_svg_file, String, description: 'Molecule svg file of molecule'
    field :is_partial, Boolean, description: 'Molecule is partial?'
    field :exact_molecular_weight, Float, description: 'Exact molecular weight of molecule'
    field :cano_smiles, String, description: 'Cano smiles of molecule'
    field :cas, String, description: 'Cas of molecule'
    field :molfile_version, String, description: 'Molfile version of molecule'
  end
end
