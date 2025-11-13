# frozen_string_literal: true

require 'rails_helper'

describe Entities::ResearchPlanEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(
        research_plan,
        detail_levels: detail_levels,
        displayed_in_list: displayed_in_list,
      )
    end

    let(:detail_levels) { { ResearchPlan => detail_level, Wellplate => detail_level } }
    let(:displayed_in_list) { false }
    let(:research_plan) { create(:research_plan, wellplates: [build(:wellplate)]) }

    before do
      research_plan.research_plan_metadata = create(:research_plan_metadata)
    end

    context 'when detail level for ResearchPlan is 10' do
      let(:detail_level) { 10 }

      it 'returns a research_plan with the following attributes' do
        expect(grape_entity_as_hash).to include(
          id: research_plan.id,
          is_restricted: false,
          body: research_plan.body,
          name: research_plan.name,
          preview_attachment: research_plan.preview_attachment,
          type: 'research_plan',
        )
      end

      it 'returns a research_plan with research_plan_metadata' do
        expect(grape_entity_as_hash[:research_plan_metadata]).not_to be_empty
      end

      it 'returns a research_plan with a tag' do
        expect(grape_entity_as_hash[:tag]).not_to be_empty
      end

      it 'returns a research_plan with a container' do
        expect(grape_entity_as_hash[:container]).not_to be_empty
      end

      it 'returns a research_plan with wellplates' do
        expect(grape_entity_as_hash[:wellplates]).not_to be_empty
      end

      it 'returns a research_plan with segments' do
        pending 'Segments are an empty array because a segments factory is missing'
        raise 'missing segments factory'
        # expect(grape_entity_as_hash[:segments]).not_to be_empty
      end
    end

    context 'when detail level for ResearchPlan is 0' do
      let(:detail_level) { 0 }

      it 'returns a research_plan with the following attributes' do
        expect(grape_entity_as_hash).to include(
          id: research_plan.id,
          is_restricted: true,
          body: research_plan.body,
          name: research_plan.name,
          preview_attachment: research_plan.preview_attachment,
          type: 'research_plan',
        )
      end

      it 'returns a research_plan with anonymized research_plan_metadata' do
        expect(grape_entity_as_hash[:research_plan_metadata]).to eq(nil)
      end

      it 'returns a research_plan with a anonymized tag' do
        expect(grape_entity_as_hash[:tag]).to eq(nil)
      end

      it 'returns a research_plan with a anonymized container' do
        expect(grape_entity_as_hash[:container]).not_to be_empty
      end

      it 'returns a research_plan with anonymized wellplates' do
        expect(grape_entity_as_hash[:wellplates]).to be_empty
      end

      it 'returns a research_plan with anonymized segments' do
        expect(grape_entity_as_hash[:segments]).to be_empty
      end
    end

    context 'when entity is displayed in list' do
      let(:displayed_in_list) { true }
      let(:detail_level) { 10 }

      it 'returns a research_plan without a container' do
        expect(grape_entity_as_hash[:container]).to eq(nil)
      end

      it 'returns a research_plan without segments' do
        expect(grape_entity_as_hash[:segments]).to be_empty
      end

      it 'returns a research_plan without wellplates' do
        expect(grape_entity_as_hash[:wellplates]).to be_empty
      end
    end
  end
end
