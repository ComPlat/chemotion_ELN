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

  def self.get_composition m_formula, p_formula = nil, p_loading = nil
    result = if p_formula.present? && p_loading.present?
      self.get_polymer_composition m_formula, p_formula, p_loading
    else
      self.get_molecule_composition m_formula
    end

    result.sort.to_h
  end

  def self.get_loading m_formula, p_formula, composition
    # select first elemental composition datum, !we take just Carbon initially!
    #dkey, dvalue = composition.select { |k, v| v.to_f > 0.0 }.first
    dkey = 'C'
    dvalue = composition[dkey]
    
    return if dvalue.nil? || dvalue == 0.0

    begin
      p_analyses = Chemotion::Calculations.analyse_formula p_formula
      m_analyses = Chemotion::Calculations.analyse_formula m_formula, true
    rescue Chemotion::Calculations::BadFormulaException
      return
    end

    wfp = p_analyses[dkey][:weight_fraction].to_d rescue 0.0
    wfm = m_analyses[dkey][:weight_fraction].to_d rescue 0.0
    mw_def = self.get_total_mw m_analyses

    loading = 1000.0 * (wfp - dvalue.to_f/100.0) / (mw_def * (wfp - wfm))
  end

private

  def self.get_polymer_composition m_formula, p_formula, p_loading
    begin
      p_analyses = Chemotion::Calculations.analyse_formula p_formula
      m_analyses = Chemotion::Calculations.analyse_formula m_formula, true
    rescue Chemotion::Calculations::BadFormulaException
      return {}
    end

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
  def self.analyse_formula formula, is_partial = false
    elements = {}

    formula.scan(/[A-Za-z]{1}[a-z]?\d*/).each do |atom|
      atom_label = atom.scan(/[A-Za-z]+/).first
      atomic_weight = Chemotion::PeriodicTable.get_atomic_weight(atom_label)

      raise BadFormulaException.new if atomic_weight.nil?

      atoms_number = (atom.scan(/\d+/).first || 1).to_i

      atoms_number -= 1.0 if atom_label == 'H' && is_partial

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
end
