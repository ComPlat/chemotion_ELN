# frozen_string_literal: true

# Reactable module
module Reactable
  extend ActiveSupport::Concern

  IDEAL_GAS_CONSTANT = 0.0821
  PARTS_PER_MILLION_FACTOR = 1_000_000
  DEFAULT_TEMPERATURE_IN_KELVIN = 294

  TIME_UNITS = {
    SECONDS: 's',
    MINUTES: 'm',
    HOURS: 'h',
  }.freeze

  TEMPERATURE_UNITS = {
    KELVIN: 'K',
    FAHRENHEIT: '°F',
    CELSIUS: '°C',
  }.freeze

  def update_equivalent
    ref_record = ReactionsSample.where(reaction_id: reaction_id, reference: true).first
    return unless ref_record
    return unless ref_record.id != id

    amount = sample.real_amount_value && sample.real_amount_value != 0 ? sample.amount_mmol(:real) : sample.amount_mmol

    case self
    when ReactionsProductSample
      amount = sample.amount_mmol(:real) if is_a? ReactionsProductSample
      ref_amount = ref_record.sample.amount_mmol(:target) *
                   (self[:coefficient] || 1.0) / (ref_record[:coefficient] || 1.0)
    else
      condition = sample.real_amount_value && sample.real_amount_value != 0
      ref_record_condition = ref_record.sample.real_amount_value && ref_record.sample.real_amount_value != 0
      amount = condition ? sample.amount_mmol(:real) : sample.amount_mmol
      ref_amount = ref_record_condition ? ref_record.sample.amount_mmol(:real) : ref_record.sample.amount_mmol
    end
    update_attribute :equivalent, ref_amount.zero? ? 0 : amount / ref_amount
  end

  def detect_amount_type
    amount_value = real_amount_value.nil? ? target_amount_value : real_amount_value
    amount_unit = real_amount_unit.nil? ? target_amount_unit : real_amount_unit
    { 'value' => amount_value, 'unit' => amount_unit }
  end

  def convert_temperature_to_kelvin(temperature)
    temperature_value = temperature['value'].to_f

    raise "Unsupported temperature unit: #{temperature['unit']}" if temperature['unit'].nil? || temperature_value.nan?

    case temperature['unit']
    when TEMPERATURE_UNITS[:FAHRENHEIT]
      ((temperature_value - 32) * 5.0 / 9) + 273.15
    when TEMPERATURE_UNITS[:CELSIUS]
      temperature_value + 273.15
    when TEMPERATURE_UNITS[:KELVIN]
      temperature_value
    else
      raise "Unsupported temperature unit: #{temperature['unit']}"
    end.abs
  end

  def reaction_vessel_volume(reaction_vessel)
    return nil if reaction_vessel['amount'].nil?

    case reaction_vessel['unit']
    when 'ml'
      reaction_vessel['amount'].to_f / 1000.0
    when 'l'
      reaction_vessel['amount'].to_i
    end
  end

  def calculate_mole_gas_product(ppm, temperature, vessel_volume)
    ##  Mol Value = ppm*pressure*V/(0.0821*temp_in_K*1000000)
    return nil if vessel_volume.nil? || ppm.nil?

    temperature_in_kelvin = convert_temperature_to_kelvin(temperature)

    return nil if temperature_in_kelvin.nil?

    ppm * vessel_volume / (IDEAL_GAS_CONSTANT * temperature_in_kelvin * PARTS_PER_MILLION_FACTOR)
  end

  def calculate_feedstock_moles(amount_liter, purity)
    amount_liter / (IDEAL_GAS_CONSTANT * DEFAULT_TEMPERATURE_IN_KELVIN * purity)
  end

  def calculate_ton(gas_product_amount_mol, catalyst_mol_value)
    if catalyst_mol_value.nil?
      nil
    else
      gas_product_amount_mol.to_f / catalyst_mol_value
    end
  end

  def calculate_ton_frequency(time, ton_value)
    ton_value / time['value'] unless time['unit'].nil?
  end

  def update_gas_material(catalyst_mol_value)
    gas_materials = ReactionsSample.where(reaction_id: reaction_id, gas_type: 3)

    gas_materials.each do |material|
      gas_phase_data = material.gas_phase_data

      reaction_vessel = Reaction.find_by(id: reaction_id).vessel_size
      vessel_volume = reaction_vessel_volume(reaction_vessel)
      gas_product_mol_amount = calculate_mole_gas_product(
        gas_phase_data['part_per_million'],
        gas_phase_data['temperature'],
        vessel_volume,
      )

      next if gas_product_mol_amount.nil?

      gas_phase_data['turnover_number'] = calculate_ton(gas_product_mol_amount, catalyst_mol_value)
      gas_phase_data['turnover_frequency']['value'] = calculate_ton_frequency(
        gas_phase_data['time'],
        gas_phase_data['turnover_number'],
      )
      material.save!
    end
  end
end
