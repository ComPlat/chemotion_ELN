# frozen_string_literal: true

require 'rails_helper'

describe Entities::ApplicationEntity do
  class TestEntity < Entities::ApplicationEntity; end

  before do
    # clear all configured entities so each spec starts with the same state
    TestEntity.instance_variable_set("@detail_level_entities", nil)
    TestEntity.unexpose_all
  end

  describe '.detail_level_entities' do
    context 'without params' do
      it 'returns the configured entities when available' do
        # configure some entities
        TestEntity.detail_level_entities(0 => Entities::SampleEntity)

        expect(TestEntity.detail_level_entities).to eq({0 => Entities::SampleEntity})
      end

      it 'returns an empty hash when no entities are configured' do
        expect(TestEntity.detail_level_entities).to eq({})
      end
    end

    context 'with non-Integer keys in params hash' do
      it 'raises an error' do
        expect { TestEntity.detail_level_entities(foo: :bar) }.to raise_error('Keys must be integer')
      end
    end

    context 'with values that don\'t inherit from ApplicationEntity in params hash' do
      it 'raises an error' do
        expect { TestEntity.detail_level_entities(0 => :bar) }.to raise_error(
          'Values must be subclasses of ApplicationEntity'
        )
      end
    end

    context 'with valid params' do
      let(:input) { { 0 => Entities::SampleEntity, 1 => Entities::ReactionEntity } }
      let(:overrides) { { 1 => Entities::WellplateEntity, 2 => Entities::ResearchPlanEntity } }

      it 'writes the params to the class and returns the current entity configuration' do
        expect(TestEntity.detail_level_entities(input)).to eq input
      end

      it 'overwrites only the entities that are explicitly given' do
        TestEntity.detail_level_entities(input)

        expect(TestEntity.detail_level_entities(overrides)).to eq({
          0 => Entities::SampleEntity,
          1 => Entities::WellplateEntity,
          2 => Entities::ResearchPlanEntity
        })
      end
    end
  end

  describe '.entity_for_level' do
    context 'when no entities are configured' do
      it 'raises an error' do
        expect { TestEntity.entity_for_level(0) }.to raise_error('TestEntity has no detail level entities defined')
      end
    end

    context 'when entities are configured' do
      before do
        TestEntity.detail_level_entities(0 => Entities::SampleEntity)
      end
      context 'without configured entity for the given level' do
        it 'raises an error' do
          expect { TestEntity.entity_for_level(9) }.to raise_error(
            'TestEntity has no defined entity for detail level 9'
          )
        end
      end

      context 'with a configured entity for the given level' do
        it 'returns the configured entity for the given level' do
          expect(TestEntity.entity_for_level(0)).to eq Entities::SampleEntity
        end
      end
    end
  end

  describe '.expose_timestamps' do
    let(:timestamp) { DateTime.new(2020, 6, 6, 12, 13, 14) }
    let(:formatted_timestamp) { I18n.l(timestamp, format: :eln_timestamp) }
    let(:input) { { created_at: timestamp, updated_at: timestamp } }
    let(:serialization_result) { TestEntity.represent(input, serializable: true) }

    context 'without params' do
      before do
        TestEntity.expose_timestamps
      end

      it 'exposes formatted timestamps of created_at and updated_at' do
        expect(serialization_result).to eq(
          { created_at: formatted_timestamp, updated_at: formatted_timestamp }
        )
      end
    end

    context 'with custom timestamp_fields' do
      let(:input) { { foo: timestamp, bar: timestamp } }

      before do
        TestEntity.expose_timestamps(timestamp_fields: %i[foo bar])
      end

      it 'exposes the given timestamp_fields in a formatted way' do
        expect(serialization_result).to eq(
          { foo: formatted_timestamp, bar: formatted_timestamp }
        )
      end
    end

    context 'with additional arguments' do
      let(:additional_arguments) do
        { documentation: { type: 'String', desc: 'formatted timestamp '} }
      end
      let(:expected_additional_arguments_created_at) do
        [:created_at, additional_arguments.merge(format_with: :eln_timestamp)]
      end

      let(:expected_additional_arguments_updated_at) do
        [:updated_at, additional_arguments.merge(format_with: :eln_timestamp)]
      end

      it 'passes the additional arguments to the expose call while adding a format_with key' do
        expect(TestEntity).to receive(:expose).with(*expected_additional_arguments_created_at)
        expect(TestEntity).to receive(:expose).with(*expected_additional_arguments_updated_at)

        TestEntity.expose_timestamps(additional_arguments)
      end
    end
  end

  describe '.expose_anonymized' do
    let(:serialization_result) { TestEntity.represent(input, serializable: true) }
    let(:input) { { foo: 1, bar: 2 } }

    context 'without given anonymization value' do
      before do
        TestEntity.expose_anonymized(:foo, :bar)
      end

      it 'exposes all given attributes with ***' do
        expect(serialization_result).to eq(foo: '***', bar: '***')
      end
    end

    context 'with given anonymization value' do
      before do
        TestEntity.expose_anonymized(:foo, :bar, with: 'lorem ipsum')
      end

      it 'exposes all given attributes with the given anonymization value' do
        expect(serialization_result).to eq(foo: 'lorem ipsum', bar: 'lorem ipsum')
      end
    end
  end
end
