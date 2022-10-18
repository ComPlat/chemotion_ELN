# frozen_string_literal: true

require 'rails_helper'

describe Entities::ScreenEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(
        screen,
        detail_levels: detail_levels,
        displayed_in_list: displayed_in_list,
      )
    end

    let(:detail_levels) do
      {
        Wellplate => detail_level,
        Screen => detail_level,
        Wellplate => detail_level,
        ResearchPlan => detail_level,
      }
    end
    let(:displayed_in_list) { false }
    let(:screen) do
      create(
        :screen,
        wellplates: [create(:wellplate)],
        research_plans: [create(:research_plan)],
        container: create(:container),
      )
    end

    context 'when detail level for Well is 10' do
      let(:detail_level) { 10 }

      it 'returns a screen with the following attributes' do
        expect(grape_entity_as_hash).to include(
          id: screen.id,
          type: 'screen',
          name: screen.name,
          is_restricted: false,
          description: screen.description,
          conditions: screen.conditions,
          requirements: screen.requirements,
          collaborator: screen.collaborator,
          result: screen.result,
          created_at: I18n.l(screen.created_at, format: :eln_timestamp),
          updated_at: I18n.l(screen.updated_at, format: :eln_timestamp),
        )
      end

      it 'returns a screen with a wellplates' do
        expect(grape_entity_as_hash[:wellplates]).not_to be_empty
      end

      it 'returns a screen with a code_log' do
        expect(grape_entity_as_hash[:code_log]).not_to be_empty
      end

      it 'returns a screen with a container' do
        expect(grape_entity_as_hash[:container]).not_to be_empty
      end

      it 'returns a screen with research_plans' do
        expect(grape_entity_as_hash[:research_plans]).not_to be_empty
      end

      it 'returns a screen with segments' do
        pending 'Segments are an empty array because a segments factory is missing'
        raise 'missing segments factory'
        # expect(grape_entity_as_hash[:segments]).not_to be_empty
      end

      it 'returns a screen with a tag' do
        expect(grape_entity_as_hash[:tag]).not_to be_empty
      end
    end

    context 'when detail level for Well is 0' do
      let(:detail_level) { 0 }

      it 'returns a screen with the following attributes' do
        expect(grape_entity_as_hash).to include(
          id: screen.id,
          type: 'screen',
          name: screen.name,
          is_restricted: true,
          description: screen.description,
          conditions: screen.conditions,
          requirements: screen.requirements,
          collaborator: '***',
          result: '***',
          created_at: I18n.l(screen.created_at, format: :eln_timestamp),
          updated_at: I18n.l(screen.updated_at, format: :eln_timestamp),
        )
      end

      it 'returns a screen with a wellplates' do
        expect(grape_entity_as_hash[:wellplates]).not_to be_empty
      end

      it 'returns a screen without a code_log' do
        expect(grape_entity_as_hash[:code_log]).to eq(nil)
      end

      it 'returns a screen without a container' do
        expect(grape_entity_as_hash[:container]).to eq(nil)
      end

      it 'returns a screen without research_plans' do
        expect(grape_entity_as_hash[:research_plans]).to be_empty
      end

      it 'returns a screen without segments' do
        pending 'Segments are an empty array because a segments factory is missing'
        raise 'missing segments factory'
        # expect(grape_entity_as_hash[:segments]).not_to be_empty
      end

      it 'returns a screen with a tag' do
        expect(grape_entity_as_hash[:tag]).to eq(nil)
      end
    end

    context 'when entity is displayed in list' do
      let(:displayed_in_list) { true }
      let(:detail_level) { 10 }

      it 'returns a screen without a code_log' do
        expect(grape_entity_as_hash[:code_log]).to eq(nil)
      end

      it 'returns a screen without a container' do
        expect(grape_entity_as_hash[:container]).to eq(nil)
      end

      it 'returns a screen without research_plans' do
        expect(grape_entity_as_hash[:research_plans]).to be_empty
      end

      it 'returns a screen without segments' do
        expect(grape_entity_as_hash[:segments]).to be_empty
      end

      it 'returns a screen without wellplates' do
        expect(grape_entity_as_hash[:wellplates]).to be_empty
      end
    end
  end
end
