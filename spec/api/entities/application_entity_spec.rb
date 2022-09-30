# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/MultipleMemoizedHelpers
describe Entities::ApplicationEntity do
  let(:test_entity_class) do
    Class.new(Entities::ApplicationEntity) do
      expose! :a, anonymize_below: 0
      expose! :b, anonymize_below: 1
      expose! :c, anonymize_below: 1, anonymize_with: 'A custom string'
      expose! :d, if: :show_d
      expose! :e
      expose! :f
      expose_timestamps
      expose_timestamps(timestamp_fields: %i[foo bar])

      def e
        'I am overridden by a method defined in the entity'
      end
    end
  end
  let(:timestamp) { DateTime.new(2020, 6, 6, 12, 13, 14) }
  let(:input) do
    {
      a: 'I am never anonymized',
      b: 'I am anonymized at level 0',
      c: 'I am anonymized at level 0 using a custom string',
      d: 'I am a regular field but hidden unless requested',
      e: 'I have content that will be overriden by a method',
      f: 'I am a regular field',
    }
  end
  let(:detail_levels) { { Hash => detail_level } }
  let(:detail_level) { 1 }
  let(:options) do
    {
      detail_levels: detail_levels,
      serializable: true,
    }
  end
  let(:result) { test_entity_class.represent(input, options) }

  describe '.expose!' do
    context 'without detail levels' do
      let(:detail_levels) { {} }

      it 'does not anonymize anything' do
        expect(result.slice(:a, :b, :c)).to eq(input.slice(:a, :b, :c))
      end
    end

    context 'with detail_levels' do
      let(:detail_level) { 0 }

      it 'anonymizes fields if their anonymized_below < detail_level' do
        expect(result.slice(:a, :b)).to eq(
          {
            a: 'I am never anonymized',
            b: '***',
          },
        )
      end

      it 'anonymizes with a default string' do
        expect(result[:b]).to eq '***'
      end

      it 'can override the default anonymization string using the option :anonymize_with' do
        expect(result[:c]).to eq 'A custom string'
      end
    end

    context 'with additional options' do
      let(:options) do
        {
          detail_levels: detail_levels,
          show_d: true,
          serializable: true,
        }
      end

      it 'passes the options to Grape::Enitity.expose' do
        expect(result[:d]).to eq 'I am a regular field but hidden unless requested'
      end
    end

    context 'with unknown option' do
      it 'raises an error' do
        expect do
          test_entity_class.expose!(:some_field, unknown_option: true)
        end.to raise_error(ArgumentError)
      end
    end
  end

  describe '.expose_timestamps' do
    let(:formatted_timestamp) { I18n.l(timestamp, format: :eln_timestamp) }
    let(:input) { { created_at: timestamp, updated_at: timestamp } }

    context 'without params' do
      it 'exposes formatted timestamps of created_at and updated_at' do
        expect(result.slice(:created_at, :updated_at)).to eq(
          { created_at: formatted_timestamp, updated_at: formatted_timestamp },
        )
      end
    end

    context 'with custom timestamp_fields' do
      let(:input) { { foo: timestamp, bar: timestamp } }

      it 'exposes the given timestamp_fields in a formatted way' do
        expect(result.slice(:foo, :bar)).to eq(
          { foo: formatted_timestamp, bar: formatted_timestamp },
        )
      end
    end
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers
