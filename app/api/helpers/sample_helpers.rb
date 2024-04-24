module SampleHelpers
  extend Grape::API::Helpers

  def db_exec_detail_level_for_sample(user_id, sample_id)
    sql = "select detail_level_sample, detail_level_wellplate from detail_level_for_sample(#{user_id},#{sample_id})"
    ActiveRecord::Base.connection.exec_query(sql)
  end

  def calculate_molecular_mass(formula)
    # to handle formulas with the molecule of crystallization like, C2HCl3O.H2O
    components = formula.split('.')
    total_mass = 0.0

    components.each do |component|
      total_mass += calculate_mass_from_groups(component)
      total_mass += calculate_mass_from_elements(component)
    end

    total_mass
  end

  def calculate_mass_from_groups(formula)
    group_pattern = /\((.*?)\)(\d*)/
    total_mass = 0.0

    # Iterate through the formula to extract groups with parentheses
    while formula.match?(group_pattern)
      formula.sub!(group_pattern) do
        group = ::Regexp.last_match(1)
        count_str = ::Regexp.last_match(2)
        count = count_str&.empty? ? 1 : count_str.to_i
        total_mass += calculate_mass_from_elements(group) * count
        ''
      end
    end

    total_mass
  end

  def calculate_mass_from_elements(formula)
    element_pattern = /([A-Z][a-z]*)(\d*)/
    total_mass = 0.0

    formula.scan(element_pattern) do |element_symbol, count_str|
      count = count_str.empty? ? 1 : count_str.to_i
      element = ChemicalElements::PeriodicTable.find(element_symbol)

      total_mass += element.atomic_amount * count if element
    end

    total_mass
  end
end
