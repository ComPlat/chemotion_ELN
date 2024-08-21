module Chemotion::Calculations

  class Molecular
    attr_accessor :molecule

    def initialize molecule
      self.molecule = molecule
    end

    #converts an amount from a unit to an other for specific molecule
    def convert_amount amount:, from_unit:, to_unit:
      {
        amount_value: '100.5',
        unit: 'ml'
      }
    end
  end

  VALUABLE_ELEMENTS = %w(S N C)
  FORMULA_PARSE_REGEXP = /([A-Za-z]{1}[a-z]{0,2})(\d*)/

  # returns only amount of each atom
  def self.parse_formula formula, is_partial = false
    elements = {}

    formula.scan(FORMULA_PARSE_REGEXP).each do |atom|
      atom_label = atom.first

      atoms_number = (atom.last.blank? ? 1 : atom.last).to_i

      atoms_number -= 1 if atom_label == 'C' && is_partial # remove 1 C
      atoms_number -= 3 if atom_label == 'H' && is_partial # remove 3 H

      if elements.has_key? atom_label
        old_val = elements[atom_label]
      end

      elements[atom_label] = atoms_number + old_val.to_i
    end
    elements
  end

  def self.get_composition m_formula, p_formula = nil, p_loading = nil
    result = if p_formula.present? && p_loading.present?
      self.get_polymer_composition m_formula, p_formula, p_loading
    else
      self.get_molecule_composition m_formula
    end

    result.sort.to_h
  end

  def self.get_loading m_formula, p_formula, composition
    begin
      p_analyses = Chemotion::Calculations.analyse_formula p_formula
      m_analyses = Chemotion::Calculations.analyse_formula m_formula
    rescue Chemotion::Calculations::BadFormulaException
      Rails.logger.error("**** Parsing formula failed for \
                                              #{p_formula}, #{m_formula} ***")
      return
    end

    # we take elements in order that gives more accurate loading value
    VALUABLE_ELEMENTS.each do |element_name|
      dvalue = composition[element_name]

      next if dvalue.nil? || dvalue == 0.0

      wfp = p_analyses[element_name][:weight_fraction].to_d rescue 0.0
      wfm = m_analyses[element_name][:weight_fraction].to_d rescue 0.0
      mw_def = self.get_total_mw m_analyses

      loading = 1000.0 * (wfp - dvalue.to_f/100.0) / (mw_def * (wfp - wfm))
      return loading if (wfp - wfm != 0.0)
    end
  end

  def self.get_yield product_data, sm_data, expected_data
    VALUABLE_ELEMENTS.each do |element_name|

      ea_p = product_data[element_name].to_f
      ea_sm = sm_data[element_name].to_f
      ea_exp = expected_data[element_name].to_f

      if ea_p * ea_exp > 0.0 && (ea_exp - ea_sm) != 0
        return (ea_p - ea_sm) / (ea_exp - ea_sm)
      end
    end

    return 0.0
  end

  def self.fixed_digit(input_num, digit_num)
    "%.#{digit_num}f" % input_num&.to_f&.round(digit_num).to_f
  end

  def self.valid_digit(input_num, precision)
    num = BigDecimal((input_num.presence || 0).to_s)
    num_str = num.to_s('F')
    num_str =~ /^0*([1-9]+\d*)?.?(0*)([1-9]*)/
    head_len, tail_len = $1&.size || 0, $3 && $2&.size || 0
    return larger_than_zero(num, head_len, tail_len, precision) if num >= 1.0
    smaller_than_zero(num, tail_len, precision)
  end

  def self.mw_from_formula(formula)
    # to handle formulas with the molecule of crystallization like, C2HCl3O.H2O
    components = formula.split('.')
    total_mass = 0.0

    components.each do |component|
      coefficient = extract_coefficient(component)

      total_mass += calculate_mass_from_groups(component) * coefficient
      total_mass += calculate_mass_from_elements(component) * coefficient
    end

    total_mass
  end

private

  def self.get_polymer_composition m_formula, p_formula, p_loading
    begin
      p_analyses = Chemotion::Calculations.analyse_formula p_formula
      m_analyses = Chemotion::Calculations.analyse_formula m_formula
    rescue Chemotion::Calculations::BadFormulaException
      return {}
    end

    return {} unless p_loading > 0.0

    m_molecular_weight = self.get_total_mw m_analyses

    m_multiplier = m_molecular_weight * p_loading / 1000.0

    return {} if m_multiplier > 1.0

    p_analyses.each do |key, value|
      value = value[:weight_fraction]
      p_analyses[key] = value * (1.0 - m_multiplier)
    end

    m_analyses.each do |key, value|
      value = value[:weight_fraction]
      m_analyses[key] = value * m_multiplier
    end

    result = m_analyses.merge!(p_analyses) do |k, oldval, newval|
      newval + oldval
    end

    self.convert_to_percents result
  end

  def self.get_molecule_composition m_formula
    begin
      m_analyses = Chemotion::Calculations.analyse_formula m_formula
    rescue Chemotion::Calculations::BadFormulaException
      return {}
    end

    m_analyses.each do |key, value|
      m_analyses[key] = value[:weight_fraction]
    end

    self.convert_to_percents m_analyses
  end

  class BadFormulaException < StandardError
  end

  # get mass pecentage for elements by formula
  def self.analyse_formula formula
    elements = {}

    formula.scan(FORMULA_PARSE_REGEXP).each do |atom|
      atom_label = atom.first
      atomic_weight = Chemotion::PeriodicTable.get_atomic_weight(atom_label)

      raise BadFormulaException.new if atomic_weight.nil?

      atoms_number = (atom.last.blank? ? 1 : atom.last).to_i

      if elements.has_key? atom_label
        old_val = elements[atom_label][:atoms_number]
      end

      elements[atom_label] = {
        atoms_number: atoms_number + old_val.to_i,
        atomic_weight: atomic_weight
      }
    end

    total_mw = self.get_total_mw elements

    elements.each do |key, value|
      weight = value[:atomic_weight] * value[:atoms_number]
      value[:weight_fraction] = weight / total_mw
    end
  end

  def self.get_total_mw elements
    elements.values.map do |atom|
      atom[:atomic_weight] * atom[:atoms_number]
    end.sum
  end

  def self.convert_to_percents elements
    elements.each do |key, value|
      elements[key] = (value.to_d * 100.0).round 2 # convert to %
    end
  end

  def self.prec_limit(precision)
    return 20 if precision > 20
    return 0 if precision < 0
    precision
  end

  def self.larger_than_zero(num, head_len, tail_len, pc)
    return "%.#{0}f" % num&.round(0) if (pc - head_len) < 0
    prec = prec_limit(pc - head_len)
    "%.#{prec}f" % num&.round(prec)
  end

  def self.smaller_than_zero(num, tail_len, pc)
    pc_for_zero = prec_limit(pc - 1)
    return "%.#{pc_for_zero}f" % num&.round(pc_for_zero) if num == 0.0
    pc_non_zero = prec_limit(pc + tail_len)
    "%.#{pc_non_zero}f" % num&.round(pc_non_zero)
  end

  def self.calculate_mass_from_groups(formula)
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

  def self.calculate_mass_from_elements(formula)
    element_pattern = /([A-Z][a-z]*)(\d*)/
    total_mass = 0.0

    formula.scan(element_pattern) do |element_symbol, count_str|
      count = count_str.empty? ? 1 : count_str.to_i
      element = ChemicalElements::PeriodicTable.find(element_symbol)

      total_mass += element.atomic_amount * count if element
    end

    total_mass
  end

  def self.extract_coefficient(component)
    match = component.match(/^\d+/)
    match ? match[0].to_i : 1
  end
end
