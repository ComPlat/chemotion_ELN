# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Reaction do
  describe 'environment values' do
    let(:default_environment) { described_class.column_defaults.fetch('environment') }

    [
      ['21,5', '21.5'], [' −4,5 ', '-4.5'], ['.5', '.5'], ['5.', '5.'],
      [0, '0'], [22.5, '22.5'], [0.00000001, '0.00000001'], ['', ''], [nil, '']
    ].each do |value, expected|
      it "normalizes #{value.inspect} without changing the unit" do
        reaction = build(:reaction, creator: build(:user),
                                    environment: { 'temperature' => { 'value' => value, 'unit' => 'degF' } })

        expect(reaction).to be_valid
        expect(reaction.environment['temperature']).to eq('value' => expected, 'unit' => 'degF')
      end
    end

    ['hot', '20-22', '-', '.', '-.', '1.013e5', '1,013.25', 'NaN', 'Infinity', false, {}, []].each do |value|
      it "rejects the new nonnumeric reading #{value.inspect}" do
        reaction = build(:reaction, creator: build(:user),
                                    environment: { 'temperature' => { 'value' => value, 'unit' => '°C' } })

        expect(reaction).not_to be_valid
        expect(reaction.errors[:environment]).to be_present
      end
    end

    %w[humidity air_pressure].each do |field|
      it "rejects a new negative #{field} reading" do
        reaction = build(:reaction, creator: build(:user), environment: { field => { 'value' => '-1' } })

        expect(reaction).not_to be_valid
        expect(reaction.errors[:environment]).to be_present
      end
    end

    it 'does not impose physical-range limits on numeric values' do
      reaction = build(:reaction, creator: build(:user), environment: {
                         'temperature' => { 'value' => '-400', 'unit' => '°C' },
                         'humidity' => { 'value' => '150', 'unit' => '%' },
                       })

      expect(reaction).to be_valid
    end

    it 'normalizes a copy of the conditions without mutating the input hash' do
      environment = { 'air_pressure' => { 'value' => '14,7', 'unit' => 'mPa' } }
      reaction = build(:reaction, creator: build(:user), environment: environment)
      reaction.validate

      expect(reaction.environment).to eq(
        default_environment.deep_merge('air_pressure' => { 'value' => '14.7', 'unit' => 'mPa' }),
      )
      expect(environment).to eq('air_pressure' => { 'value' => '14,7', 'unit' => 'mPa' })
    end

    [{}, { 'temperature' => { 'value' => '20' } }].each do |environment|
      it "fills missing readings and properties for #{environment.inspect}" do
        original = default_environment.deep_dup
        reaction = build(:reaction, creator: build(:user), environment: environment)

        expect(reaction).to be_valid
        expect(reaction.environment).to eq(original.deep_merge(environment))
        expect(default_environment).to eq(original)
      end
    end

    it 'normalizes partial readings without writing into nested column defaults' do
      defaults = described_class.column_defaults.deep_dup
      defaults.fetch('environment').each_value(&:freeze)
      allow(described_class).to receive(:column_defaults).and_return(defaults)
      reaction = build(:reaction, creator: build(:user), environment: { 'temperature' => { 'value' => '20' } })

      expect(reaction).to be_valid
      expect(reaction.environment['humidity']).to eq('value' => '', 'unit' => '%')
    end

    context 'when updating a reaction' do
      let(:environment) { default_environment.deep_merge('temperature' => { 'value' => '21.5', 'unit' => '°C' }) }
      let(:reaction) { create(:reaction, environment: environment) }

      it 'preserves a numeric reading when renaming the reaction' do
        reaction.update!(name: 'Renamed reaction')

        expect(reaction.reload.environment).to eq environment
      end

      it 'normalizes decimal commas when editing another condition' do
        reaction.update!(environment: environment.merge('humidity' => { 'value' => '45,5', 'unit' => '%' }))

        expect(reaction.reload.environment).to eq(
          environment.merge('humidity' => { 'value' => '45.5', 'unit' => '%' }),
        )
      end

      it 'rejects replacing a numeric reading with text' do
        reaction.environment = environment.deep_merge('temperature' => { 'value' => 'hot' })

        expect(reaction).not_to be_valid
        expect(reaction.reload.environment).to eq environment
      end

      it 'validates stored readings even when only the name changes' do
        invalid = environment.deep_merge('temperature' => { 'value' => 'hot' })
        reaction.update_column(:environment, invalid) # rubocop:disable Rails/SkipsModelValidations
        reaction.reload

        expect(reaction.update(name: 'Renamed reaction')).to be false
        expect(reaction.errors[:environment]).to be_present
      end

      it 'rejects a nonnumeric change made in place in the JSON object' do
        reaction.environment['temperature']['value'] = '20-22'

        expect(reaction).not_to be_valid
        expect(reaction.reload.environment).to eq environment
      end

      it 'normalizes a changed temperature reading' do
        reaction.update!(environment: environment.deep_merge('temperature' => { 'value' => '22,5' }))

        expect(reaction.reload.environment['temperature']).to eq('value' => '22.5', 'unit' => '°C')
      end

      it 'allows clearing a reading' do
        reaction.update!(environment: environment.deep_merge('temperature' => { 'value' => '' }))

        expect(reaction.reload.environment['temperature']['value']).to eq ''
      end

      it 'allows copying numeric readings to a new record' do
        copy = reaction.dup

        expect(copy).to be_valid
        expect(copy.environment).to eq environment
      end
    end
  end
end
