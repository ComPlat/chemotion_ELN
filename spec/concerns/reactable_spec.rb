# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Reactable, type: :module do
  let(:reactable) { Class.new { include Reactable }.new }
  let(:sample_with_target_amount) { create(:sample, real_amount_value: nil, target_amount_value: 10, target_amount_unit: 'mol') }
  let(:sample_with_real_amount) do
    create(:sample, real_amount_value: 15, real_amount_unit: 'mol', target_amount_value: 10, target_amount_unit: 'g')
  end
  let(:reaction) { create(:reaction) }
  let(:reaction_id) { reaction.id }
  let(:product_sample) do
    create(:reactions_product_sample,
           reaction: reaction,
           sample: sample_with_target_amount,
           gas_phase_data: {
             'time' => { 'unit' => 's', 'value' => 3999 },
             'temperature' => { 'unit' => '°C', 'value' => 1 },
             'turnover_number' => nil,
             'part_per_million' => 1_000_00,
             'turnover_frequency' => { 'unit' => 'TON/h', 'value' => nil },
           })
  end

  describe '#test methods for gas phase reaction samples' do
    describe '#detect_amount_type' do
      it 'returns a hash with sample target_amount_value and target_amount_unit' do
        result = sample_with_target_amount.detect_amount_type
        expect(result).to eq({ 'value' => 10, 'unit' => 'mol' })
      end

      it 'returns a hash with sample real_amount_value and real_amount_unit' do
        result = sample_with_real_amount.detect_amount_type
        expect(result).to eq({ 'value' => 15, 'unit' => 'mol' })
      end
    end

    describe '#convert_temperature_to_kelvin' do
      it 'converts Fahrenheit to Kelvin correctly' do
        temperature = { 'value' => 32, 'unit' => '°F' }
        result = reactable.convert_temperature_to_kelvin(temperature)
        expect(result).to eq(273.15)
      end

      it 'converts Celsius to Kelvin' do
        temperature = { 'value' => 20, 'unit' => '°C' }
        result = reactable.convert_temperature_to_kelvin(temperature)

        expect(result).to eq(293.15)
      end

      it 'returns Kelvin as is' do
        temperature = { 'value' => 300, 'unit' => 'K' }
        result = reactable.convert_temperature_to_kelvin(temperature)

        expect(result).to eq(300)
      end

      it 'returns nil for for unsupported temperature units' do
        temperature = { 'value' => 20, 'unit' => nil }

        expect(reactable.convert_temperature_to_kelvin(temperature)).to be_nil
      end
    end

    describe '#reaction_vessel_volume' do
      it 'converts ml to liters' do
        vessel = { 'amount' => 500, 'unit' => 'ml' }
        result = reactable.reaction_vessel_volume(vessel)

        expect(result).to eq(0.5)
      end

      it 'returns liters as is' do
        vessel = { 'amount' => 2, 'unit' => 'l' }
        result = reactable.reaction_vessel_volume(vessel)

        expect(result).to eq(2)
      end

      it 'returns nil for unsupported units' do
        vessel = { 'amount' => 2, 'unit' => nil }
        result = reactable.reaction_vessel_volume(vessel)

        expect(result).to be_nil
      end
    end

    describe '#calculate_mole_gas_product' do
      it 'calculates mole of gas product correctly' do
        temperature = { 'value' => 25, 'unit' => '°C' }
        vessel_volume = 1.0
        ppm = 100

        result = reactable.calculate_mole_gas_product(ppm, temperature, vessel_volume)

        expect(result).to eq(4.085281893642546e-06)
      end

      it 'returns nil if vessel volume is nil' do
        result = reactable.calculate_mole_gas_product(100, { 'value' => 25, 'unit' => '°C' }, nil)
        expect(result).to be_nil
      end

      it 'returns nil if temperature is nil' do
        result = reactable.calculate_mole_gas_product(100, nil, 1.0)
        expect(result).to be_nil
      end

      it 'returns nil if ppm is nil' do
        result = reactable.calculate_mole_gas_product(nil, { 'value' => 25, 'unit' => '°C' }, 1.0)
        expect(result).to be_nil
      end
    end

    describe '#calculate_feedstock_moles' do
      it 'calculates feedstock moles correctly' do
        amount_liter = 1.0
        purity = 0.95
        result = reactable.calculate_feedstock_moles(amount_liter, purity)

        expect(result).to eq(0.043609981975994444)
      end
    end

    describe '#convert_time' do
      it 'converts seconds to minutes correctly' do
        expect(reactable.convert_time(120, :seconds, :minutes)).to eq(2)
      end

      it 'converts minutes to hours correctly' do
        expect(reactable.convert_time(120, :minutes, :hours)).to eq(2)
      end

      it 'converts hours to seconds correctly' do
        expect(reactable.convert_time(1, :hours, :seconds)).to eq(3600)
      end

      it 'returns nil for unsupported time units' do
        expect(reactable.convert_time(1, :days, :seconds)).to be_nil
      end
    end

    describe '#calculate_ton_per_time_value' do
      it 'calculates time values when time unit is seconds' do
        result = reactable.calculate_ton_per_time_value(3600, 's')
        expect(result).to eq({ hours: 1, minutes: 60, seconds: 3600 })
      end

      it 'calculates time values when time unit is minutes' do
        result = reactable.calculate_ton_per_time_value(120, 'm')
        expect(result).to eq({ hours: 2, minutes: 120, seconds: 7200 })
      end

      it 'calculates time values when time unit is hours' do
        result = reactable.calculate_ton_per_time_value(2, 'h')
        expect(result).to eq({ hours: 2, minutes: 120, seconds: 7200 })
      end

      it 'returns nil for unsupported time units' do
        expect(reactable.calculate_ton_per_time_value(1, 'd')).to be_nil
      end
    end

    describe '#extract_time_value' do
      it 'extracts seconds from time values' do
        time_values = { seconds: 3600, minutes: 60, hours: 1 }
        expect(reactable.extract_time_value('TON/s', time_values)).to eq(3600)
      end

      it 'extracts minutes from time values' do
        time_values = { seconds: 3600, minutes: 60, hours: 1 }
        expect(reactable.extract_time_value('TON/m', time_values)).to eq(60)
      end

      it 'extracts hours from time values' do
        time_values = { seconds: 3600, minutes: 60, hours: 1 }
        expect(reactable.extract_time_value('TON/h', time_values)).to eq(1)
      end

      it 'returns nil for unsupported time frequency units' do
        time_values = { seconds: 3600, minutes: 60, hours: 1 }
        expect(reactable.extract_time_value('d', time_values)).to be_nil
      end
    end

    describe '#calculate_ton' do
      it 'calculates turnover number correctly' do
        gas_product_amount_mole = 10.0
        catalyst_mole_value = 2.0

        result = reactable.calculate_ton(gas_product_amount_mole, catalyst_mole_value)

        expect(result).to eq(5.0)
      end

      it 'returns nil if catalyst mole value is nil' do
        result = reactable.calculate_ton(10.0, nil)
        expect(result).to be_nil
      end
    end

    describe '#calculate_ton_frequency' do
      it 'calculates turnover frequency correctly' do
        expect(reactable.calculate_ton_frequency(2, 10)).to eq(5)
      end

      it 'returns nil if time value is nil' do
        expect(reactable.calculate_ton_frequency(nil, 10)).to be_nil
      end

      it 'returns nil if turnover number is nil' do
        expect(reactable.calculate_ton_frequency(2, nil)).to be_nil
      end
    end

    describe '#update_gas_phase_data' do
      let(:gas_phase_data) do
        {
          'part_per_million' => 1,
          'temperature' => { 'unit' => '°C', 'value' => 1 },
          'time' => { 'value' => 2, 'unit' => 'm' },
          'turnover_frequency' => { 'unit' => 'TON/h', 'value' => nil },
          'turnover_number' => nil,
        }
      end

      let(:gas_phase_data_with_nil_time) do
        {
          'part_per_million' => 1,
          'temperature' => { 'unit' => '°C', 'value' => 1 },
          'time' => { 'value' => nil, 'unit' => 'm' },
          'turnover_frequency' => { 'unit' => 'TON/h', 'value' => nil },
          'turnover_number' => nil,
        }
      end

      let(:resulting_gas_phase_data) do
        {
          'part_per_million' => 1,
          'temperature' => { 'unit' => '°C', 'value' => 1 },
          'time' => { 'value' => 2, 'unit' => 'm' },
          'turnover_frequency' => { 'unit' => 'TON/h', 'value' => 300 },
          'turnover_number' => 10.0,
        }
      end

      it 'updates gas_phase_data with correct turnover number and frequency' do
        result = reactable.update_gas_phase_data(1.0, 10.0, gas_phase_data)
        expect(result['turnover_number']).to eq(10.0)
        expect(result['turnover_frequency']['value']).to eq(300.0)
      end

      it 'returns the same gas_phase_data if time values or time value is nil' do
        result = reactable.update_gas_phase_data(1.0, 10.0, gas_phase_data_with_nil_time)
        expect(result).to eq(gas_phase_data_with_nil_time)
      end

      it 'returns the same gas_phase_data if catalyst mole value is nil' do
        result = reactable.update_gas_phase_data(nil, 10.0, gas_phase_data)
        expect(result).to eq(gas_phase_data)
      end
    end

    describe '#update_gas_material' do
      before do
        allow(reactable).to receive_messages(
          find_reaction_sample_by_id: [product_sample],
          find_reaction_vessel: { 'amount' => 1, 'unit' => 'l' },
        )
      end

      it 'updates the gas_phase_data for each gas material' do
        catalyst_mole_value = 10
        updated_gas_materials = reactable.update_gas_material(catalyst_mole_value)
        updated_gas_phase_data = {
          'time' => { 'unit' => 's', 'value' => 3999 },
          'temperature' => { 'unit' => '°C', 'value' => 1 },
          'turnover_number' => 0.00044429210161937805,
          'part_per_million' => 1_000_00,
          'turnover_frequency' => { 'unit' => 'TON/h', 'value' => 0.00039996288217798476 },
        }
        expect(updated_gas_materials.first.gas_phase_data).to eq(updated_gas_phase_data)
      end
    end
  end
end
