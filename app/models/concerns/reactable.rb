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

  TOF_UNITS = {
    PER_SECOND: 'TON/s',
    PER_MINUTE: 'TON/m',
    PER_HOUR: 'TON/h',
  }.freeze

  def update_equivalent
    ref_record = ReactionsSample.find_by(reaction_id: reaction_id, reference: true)
    return if ref_record.nil? ||
              ref_record.id == id ||
              sample&.sample_type == Sample::SAMPLE_TYPE_MIXTURE

    amount = sample.real_amount_value && sample.real_amount_value != 0 ? sample.amount_mmol(:real) : sample.amount_mmol

    case self
    when ReactionsProductSample
      amount = sample.amount_mmol(:real) if is_a? ReactionsProductSample
      ref_amount = ref_record.sample.amount_mmol(:target) *
                   (self[:coefficient] || 1.0) / (ref_record[:coefficient] || 1.0)
    else
      condition = sample.real_amount_value && sample.real_amount_value != 0
      ref_record_condition = ref_record.sample.real_amount_value && ref_record.sample.real_amount_value != 0
      amount = condition ? sample.amount_mmol(:real, self.gas_type) : sample.amount_mmol(nil, self.gas_type)
      ref_amount = ref_record_condition ? ref_record.sample.amount_mmol(:real) : ref_record.sample.amount_mmol
    end
    if gas_type == 'gas'
      return nil if gas_phase_data.nil? || gas_phase_data['ppm'].nil? || gas_phase_data['temperature'].nil?

      temperature_in_kelvin = convert_temperature_to_kelvin(gas_phase_data['temperature'])
      update_attribute :equivalent, calculate_equivalent_for_gas_material(
        sample.purity || 1,
        temperature_in_kelvin,
        gas_phase_data['ppm'],
      )
    else
      update_attribute :equivalent, ref_amount.zero? ? 0 : amount / ref_amount
    end
  end

  def detect_amount_type
    condition = real_amount_value.nil? || real_amount_unit.nil?
    return { 'value' => target_amount_value, 'unit' => target_amount_unit } if condition

    { 'value' => real_amount_value, 'unit' => real_amount_unit }
  end

  def convert_temperature_to_kelvin(temperature)
    temperature_value = temperature['value'].to_f

    return nil if temperature['unit'].nil? || temperature_value.nan?

    case temperature['unit']
    when TEMPERATURE_UNITS[:FAHRENHEIT]
      ((temperature_value - 32) * 5.0 / 9) + 273.15
    when TEMPERATURE_UNITS[:CELSIUS]
      temperature_value + 273.15
    when TEMPERATURE_UNITS[:KELVIN]
      temperature_value
    end.abs
  end

  def reaction_vessel_volume(reaction_vessel)
    return nil if reaction_vessel['amount'].nil? || reaction_vessel['unit'].nil?

    case reaction_vessel['unit']
    when 'ml'
      reaction_vessel['amount'].to_f / 1000.0
    when 'l'
      reaction_vessel['amount'].to_i
    end
  end

  def calculate_mole_gas_product(ppm, temperature, vessel_volume)
    ##  Mol Value = ppm*pressure*V/(0.0821*temp_in_K*1000000)
    return nil if vessel_volume.nil? || ppm.nil? || temperature.nil?

    temperature_in_kelvin = convert_temperature_to_kelvin(temperature)

    return nil if temperature_in_kelvin.nil?

    ppm * vessel_volume / (IDEAL_GAS_CONSTANT * temperature_in_kelvin * PARTS_PER_MILLION_FACTOR)
  end

  def calculate_feedstock_moles(amount_liter, purity)
    amount_liter / (IDEAL_GAS_CONSTANT * DEFAULT_TEMPERATURE_IN_KELVIN * purity)
  end

  def calculate_ton(gas_product_mol_amount, catalyst_mol_value)
    return nil if catalyst_mol_value.nil? || gas_product_mol_amount.nil?

    gas_product_mol_amount.to_f / catalyst_mol_value
  end

  def convert_time(value, from_unit, to_unit)
    conversion_factors = {
      seconds: { minutes: 1.0 / 60, hours: 1.0 / 3600, seconds: 1 },
      minutes: { seconds: 60, hours: 1.0 / 60, minutes: 1 },
      hours: { seconds: 3600, minutes: 60, hours: 1 },
    }

    return nil unless conversion_factors.key?(from_unit) && conversion_factors[from_unit].key?(to_unit)

    value * conversion_factors[from_unit][to_unit]
  end

  def calculate_ton_per_time_value(time_value, time_unit)
    return nil if time_value.nil? || time_unit.nil?

    case time_unit
    when TIME_UNITS[:SECONDS]
      {
        hours: convert_time(time_value, :seconds, :hours),
        minutes: convert_time(time_value, :seconds, :minutes),
        seconds: time_value,
      }
    when TIME_UNITS[:MINUTES]
      {
        hours: convert_time(time_value, :minutes, :hours),
        minutes: time_value,
        seconds: convert_time(time_value, :minutes, :seconds),
      }
    when TIME_UNITS[:HOURS]
      {
        hours: time_value,
        minutes: convert_time(time_value, :hours, :minutes),
        seconds: convert_time(time_value, :hours, :seconds),
      }
    end
  end

  def extract_time_value(tof_unit, time_values)
    return nil if tof_unit.nil? || time_values.nil?

    case tof_unit
    when TOF_UNITS[:PER_SECOND]
      time_values[:seconds]
    when TOF_UNITS[:PER_MINUTE]
      time_values[:minutes]
    when TOF_UNITS[:PER_HOUR]
      time_values[:hours]
    end
  end

  def calculate_ton_frequency(time_value, ton_value)
    return nil if time_value.nil? || ton_value.nil?

    ton_value / time_value
  end

  def update_gas_phase_data(catalyst_mol_value, gas_product_mol_amount, gas_phase_data)
    return gas_phase_data if catalyst_mol_value.nil?

    gas_phase_data['turnover_number'] = calculate_ton(gas_product_mol_amount, catalyst_mol_value)
    time_values = calculate_ton_per_time_value(gas_phase_data['time']['value'], gas_phase_data['time']['unit'])
    return gas_phase_data unless time_values

    time_value = extract_time_value(gas_phase_data['turnover_frequency']['unit'], time_values)
    return gas_phase_data unless time_values && time_value

    gas_phase_data['turnover_frequency']['value'] = calculate_ton_frequency(
      time_value,
      gas_phase_data['turnover_number'],
    )
    gas_phase_data
  end

  def find_reaction_sample_by_id
    ReactionsSample.where(reaction_id: reaction_id, gas_type: 3)
  end

  def find_reaction_vessel
    Reaction.find_by(id: reaction_id).vessel_size
  end

  def update_gas_material(catalyst_mol_value)
    find_reaction_sample_by_id.each do |material|
      gas_phase_data = material.gas_phase_data

      reaction_vessel = find_reaction_vessel
      vessel_volume = reaction_vessel_volume(reaction_vessel)
      gas_product_mol_amount = calculate_mole_gas_product(
        gas_phase_data['part_per_million'],
        gas_phase_data['temperature'],
        vessel_volume,
      )

      next if gas_product_mol_amount.nil?

      material.gas_phase_data = update_gas_phase_data(catalyst_mol_value, gas_product_mol_amount, gas_phase_data)
      material.save!
    end
  end

  def calculate_equivalent_for_gas_material(purity, temperature_in_kelvin, ppm)
    ppm * DEFAULT_TEMPERATURE_IN_KELVIN / purity * PARTS_PER_MILLION_FACTOR * temperature_in_kelvin
  end
end
