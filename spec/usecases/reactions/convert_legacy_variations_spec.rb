# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Reactions::ConvertLegacyVariations do
  let(:reference) { create(:sample) }
  let(:other) { create(:sample) }
  let(:product) { create(:sample, target_amount_value: nil, real_amount_value: 0.5, real_amount_unit: 'g') }
  let(:solvent) { create(:sample, target_amount_value: 0.01, target_amount_unit: 'l') }
  let(:row_uuid) { SecureRandom.uuid }
  let(:reaction_uuid) { SecureRandom.uuid }
  let(:reaction) do
    create(:reaction,
           temperature: { 'valueUnit' => '°F', 'userText' => '68', 'data' => [] },
           duration: '1 Hour(s)')
  end

  let(:legacy_data) do
    {
      'id' => 1,
      'uuid' => row_uuid,
      'startingMaterials' => {
        reference.id.to_s => {
          'mass' => { 'value' => 2, 'unit' => 'g' },
          'equivalent' => { 'value' => 7, 'unit' => nil },
          'aux' => {},
        },
        other.id.to_s => {
          'mass' => { 'value' => 0.5, 'unit' => 'g' },
          'amount' => { 'value' => 0.03, 'unit' => 'mol' },
          'equivalent' => { 'value' => 0.25, 'unit' => nil },
          'aux' => {},
        },
        'gone' => { 'mass' => { 'value' => 9, 'unit' => 'g' }, 'aux' => {} },
      },
      'products' => {
        product.id.to_s => { 'mass' => { 'value' => 1.5, 'unit' => 'g' }, 'yield' => { 'value' => 40, 'unit' => '%' } },
      },
      'solvents' => {
        solvent.id.to_s => { 'volume' => { 'value' => 0.002, 'unit' => 'l' }, 'aux' => {} },
      },
      'properties' => {
        'temperature' => { 'value' => 100, 'unit' => '°C' },
        'duration' => { 'value' => 5400, 'unit' => 'Second(s)' },
      },
      'metadata' => { 'notes' => 'note', 'analyses' => [], 'group' => { 'group' => 1, 'subgroup' => 1 } },
    }
  end

  let(:variation) do
    {
      'id' => row_uuid, 'idx' => 1, 'group' => [1, 1], 'analyses' => [], 'notes' => 'note',
      'data' => { 'id' => reaction_uuid }, 'legacy_data' => legacy_data
    }
  end

  let(:data) { reaction.reload.variations.first['data'] }

  before do
    ReactionsStartingMaterialSample.create!(reaction: reaction, sample: reference, reference: true, position: 0)
    ReactionsStartingMaterialSample.create!(reaction: reaction, sample: other, position: 1)
    ReactionsProductSample.create!(reaction: reaction, sample: product, position: 0)
    ReactionsSolventSample.create!(reaction: reaction, sample: solvent, position: 0)
    reaction.update_column(:variations, [variation]) # rubocop:disable Rails/SkipsModelValidations
  end

  it 'converts the row and reports it' do
    expect(described_class.new(reaction.reload).perform!).to eq(1)
    expect(data['id']).to eq(reaction_uuid)
  end

  context 'when converted' do
    before { described_class.new(reaction.reload).perform! }

    it 'writes material amounts by position, in the unit and amount field each sample uses' do
      expect(data['_starting_materials']).to eq([
                                                  { '_target_amount_value' => 2.0, '_target_amount_unit' => 'g' },
                                                  { '_target_amount_value' => 0.5, '_target_amount_unit' => 'g',
                                                    '_equivalent' => 0.25 },
                                                ])
      expect(data['_solvents']).to eq([{ '_target_amount_value' => 0.002, '_target_amount_unit' => 'l' }])
    end

    it 'writes a product amount into the real amount, and its yield as a fraction' do
      expect(data['_products']).to eq([
                                        { '_real_amount_value' => 1.5, '_real_amount_unit' => 'g',
                                          '_equivalent' => 0.4 },
                                      ])
    end

    it 'writes temperature and duration in the units the reaction uses' do
      expect(data['_temperature']).to eq('valueUnit' => '°F', 'userText' => '212')
      expect(data['_duration']).to eq('1.5 Hour(s)')
      expect(data['_durationDisplay']).to include('dispValue' => '1.5', 'dispUnit' => 'Hour(s)')
    end

    it 'keeps the legacy body, so the conversion can be rolled back' do
      expect(reaction.reload.variations.first['legacy_data']).to eq(legacy_data)
    end

    it 'leaves a converted row alone when run again' do
      expect(described_class.new(reaction.reload).perform!).to eq(0)
    end
  end

  context 'when the row has been edited since the migration' do
    let(:variation) { super().merge('data' => { 'id' => reaction_uuid, 'volume' => 0.1 }) }

    it 'does not overwrite the edit' do
      expect(described_class.new(reaction.reload).perform!).to eq(0)
      expect(data).to eq('id' => reaction_uuid, 'volume' => 0.1)
    end
  end

  context 'with a gas product' do
    let(:legacy_data) do
      {
        'products' => {
          product.id.to_s => {
            'amount' => { 'value' => 0.001, 'unit' => 'mol' },
            'concentration' => { 'value' => 500, 'unit' => 'ppm' },
            'temperature' => { 'value' => 30, 'unit' => '°C' },
            'duration' => { 'value' => 1800, 'unit' => 'Second(s)' },
            'turnoverNumber' => { 'value' => 12, 'unit' => nil },
            'turnoverFrequency' => { 'value' => 24, 'unit' => nil },
            'aux' => { 'gasType' => 'gas' },
          },
        },
      }
    end

    it 'writes the gas phase data in the units the sample uses' do
      ReactionsProductSample.find_by(sample: product).update!(
        gas_type: 'gas',
        gas_phase_data: { 'time' => { 'unit' => 'h', 'value' => 1 },
                          'temperature' => { 'unit' => 'K', 'value' => 298 } },
      )
      described_class.new(reaction.reload).perform!

      entry = data['_products'].first
      expect(entry['_gas_phase_data']).to eq(
        'part_per_million' => 500.0,
        'turnover_number' => 12.0,
        'turnover_frequency' => { 'unit' => 'TON/h', 'value' => 24.0 },
        'temperature' => { 'unit' => 'K', 'value' => 303.15 },
        'time' => { 'unit' => 'h', 'value' => 0.5 },
      )
      expect(entry).to include('_real_amount_value' => 0.001, '_real_amount_unit' => 'mol')
    end
  end

  context 'with nothing that can be converted' do
    let(:legacy_data) { { 'startingMaterials' => { 'gone' => { 'mass' => { 'value' => 1, 'unit' => 'g' } } } } }

    it 'leaves the row to the client' do
      expect(described_class.new(reaction.reload).perform!).to eq(0)
      expect(data).to eq('id' => reaction_uuid)
    end
  end
end
