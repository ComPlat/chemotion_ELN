# frozen_string_literal: true

module Export
  class ExportComponents
    # A mapping of component field names to their corresponding SQL expressions, labels.
    #
    # Each key represents a component property.
    # Each value is an array with:
    # - SQL expression for selecting the data
    # - Column label
    #
    # @return [Hash{Symbol => Array<String, String, Integer>}]
    COMPONENT_QUERIES = {
      'name' => ['comp."name"', '"name"', 10],
      'purity' => ['comp."component_properties"->>\'purity\'', '"purity"', 10],
      'density' => ['comp."component_properties"->>\'density\'', '"density"', 10],
      'stock' => ['comp."component_properties"->>\'starting_molarity_value\'', '"stock"', 10],
      'mass' => ['comp."component_properties"->>\'amount_g\'', '"mass"', 10],
      'volume' => ['comp."component_properties"->>\'amount_l\'', '"volume"', 10],
      'amount' => ['comp."component_properties"->>\'amount_mol\'', '"amount"', 10],
      'ratio' => ['comp."component_properties"->>\'equivalent\'', '"ratio"', 10],
      'total concentration' => ['comp."component_properties"->>\'molarity_value\'', '"total concentration"', 10],
      'reference' => ['comp."component_properties"->>\'reference\'', '"reference"', 10],
      'material group' => ['comp."component_properties"->>\'material_group\'', '"material group"', 10],
      # Molecule properties
      'canonical smiles' => ['m.cano_smiles', '"canonical smiles"', 10],
      'InChI' => ['m.inchikey', '"InChI"', 10],
      # molecule_sum_formula: ['m.sum_formular', '"sum formula"', 10],
      # molecule_inchistring: ['m.inchistring', '"inchistring"', 10],
      # molecule_molecular_weight: ['m.molecular_weight', '"MW"', 0],

      # heterogeneous material properties could be added here
      'source' => ['comp."component_properties"->>\'source\'', '"source"', 10],
      'molar_mass' => ['comp."component_properties"->>\'molar_mass\'', '"molar_mass"', 10],
      'molecule_id' => ['comp."component_properties"->>\'molecule_id\'', '"molecule_id"', 10],
      'weight_ratio_exp' => ['comp."component_properties"->>\'weight_ratio_exp\'', '"weight_ratio_exp"', 10],
      'template_category' => ['comp."component_properties"->>\'template_category\'', '"template_category"', 10],

    }.freeze

    # An array of all supported component field names (as strings).
    #
    # @return [Array<String>]
    COMPONENT_FIELDS = COMPONENT_QUERIES.keys.map(&:to_s).freeze

    COMPONENT_HEADER_UNITS = {
      'volume' => 'L',
      'amount' => 'mol',
      'ratio' => '', # or 'eq'
      'total concentration' => 'mol/L',
      'density' => 'g/mL',
      'mass' => 'g',
      'stock' => 'mol/L',
    }.freeze

    # Builds an array of SQL selection strings for components based on selected fields.
    #
    # @param selection [String] base SQL selection string (e.g., default columns for a sample)
    # @param sel [Hash{Symbol => Array<String>}] a hash with `:components` key holding selected component field names
    # @option sel [Array<String>] :components List of fields to include (must match COMPONENT_FIELDS)
    # @return [Array<String>] array of SQL selection strings including both base and component-specific fields
    #
    # @example
    #   build_component_column_query("samples.*", { components: ["name", "mass"] })
    #   => ["samples.*", ["comp.\"name\" as \"name\"", "comp.\"component_properties\"->>'amount_g' as \"mass\""]]
    def self.build_component_column_query(selection, sel)
      component_selections = sel[:components].filter_map do |col|
        query = COMPONENT_QUERIES[col.to_s.strip]
        "#{query[0]} as #{query[1]}" if query
      end

      gathered_selections = []
      gathered_selections << selection
      gathered_selections << component_selections
    end

    def self.header_with_units(header)
      unit = COMPONENT_HEADER_UNITS[header]
      unit.present? ? "#{header} (#{unit})" : header
    end

    # Formats component values for Excel export
    def self.format_component_value(column, value)
      return 1 if column == 'ratio' && value.nil? # Show 1 if ratio is nil
      # Round floats to 6 decimals if value is a float-like string
      return value.to_f.round(6).to_s if value.is_a?(String) && value.match?(/\A-?\d+\.\d+\z/)

      value
    end
  end
end
