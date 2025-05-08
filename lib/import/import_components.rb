# frozen_string_literal: true

module Import
  class ImportComponents
    COMPONENT_HEADER_MAPPING = {
      'stock' => 'starting_molarity_value',
      'density' => 'density',
      'volume' => 'amount_l',
      'amount' => 'amount_mol',
      'ratio' => 'equivalent',
      'reference' => 'reference',
      'total concentration' => 'molarity_value',
      'label' => 'label',
      'purity' => 'purity',
      'mass' => 'amount_g',
      'material group' => 'material_group',
      'canonical smiles' => 'canonical smiles',
      'inchi' => 'inchikey',
    }.freeze

    COMPONENT_IMPORT_FIELDS = %w[
      purity
      density
      amount_g
      amount_l
      reference
      amount_mol
      equivalent
      molecule_id
      molarity_unit
      material_group
      molarity_value
      starting_molarity_value
    ].freeze

    def self.component_save(component_data, sample, molecule, position)
      Component.create!(
        name: component_data[:name],
        position: position,
        sample_id: sample.id,
        component_properties: component_properties(component_data, molecule),
      )
    end

    def self.component_properties(component_data, molecule)
      properties = {}

      COMPONENT_IMPORT_FIELDS.each do |field|
        properties[field] = component_data[field]
      end

      properties['molecule_id'] = molecule.id
      properties['molarity_unit'] = 'M'
      properties['molecule'] = molecule_data(molecule)

      properties
    end

    def self.molecule_data(molecule)
      {
        'id' => molecule.id,
        'inchikey' => molecule.inchikey,
        'inchistring' => molecule.inchistring,
        'density' => molecule.density,
        'molecular_weight' => molecule.molecular_weight,
        'molfile' => molecule.molfile,
        'melting_point' => molecule.melting_point,
        'boiling_point' => molecule.boiling_point,
        'sum_formular' => molecule.sum_formular,
        'names' => molecule.names,
        'iupac_name' => molecule.iupac_name,
        'molecule_svg_file' => molecule.molecule_svg_file,
        'created_at' => molecule.created_at,
        'updated_at' => molecule.updated_at,
        'deleted_at' => molecule.deleted_at,
        'is_partial' => molecule.is_partial,
        'exact_molecular_weight' => molecule.exact_molecular_weight,
        'cano_smiles' => molecule.cano_smiles,
        'cas' => molecule.cas,
        'molfile_version' => molecule.molfile_version,
      }
    end
  end
end
