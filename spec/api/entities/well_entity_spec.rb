# frozen_string_literal: true

require 'rails_helper'

describe Entities::WellEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(
        well,
        detail_levels: detail_levels,
        displayed_in_list: displayed_in_list,
      )
    end

    let(:detail_levels) { { Well => detail_level, Sample => detail_level } }
    let(:displayed_in_list) { false }
    let(:sample) { create(:sample) }
    let(:well) { create(:well, :with_color_code_and_additive, sample: sample) }

    context 'when detail level for Well is 10' do
      let(:detail_level) { 10 }

      it 'returns a well with the following attributes' do
        expect(grape_entity_as_hash).to include(
          id: well.id,
          is_restricted: false,
          position: { x: well.position_x, y: well.position_y },
          type: 'well',
          readouts: well.readouts,
          additive: well.additive,
          color_code: well.color_code,
          label: well.label,
        )
      end

      it 'returns a well with a sample' do
        expect(grape_entity_as_hash[:sample]).not_to be_empty
      end
    end

    context 'when detail level for Well is 1' do
      let(:detail_level) { 1 }

      it 'returns a well with the following attributes' do
        expect(grape_entity_as_hash).to include(
          id: well.id,
          is_restricted: true,
          position: { x: well.position_x, y: well.position_y },
          type: 'well',
          readouts: well.readouts,
          additive: '***',
          color_code: '***',
          label: '***',
        )
      end

      it 'returns a well with a sample' do
        expect(grape_entity_as_hash[:sample]).not_to be_empty
      end
    end

    context 'when detail level for Well is 0' do
      let(:detail_level) { 0 }

      it 'returns a well with the following attributes' do
        expect(grape_entity_as_hash).to include(
          id: well.id,
          is_restricted: true,
          position: { x: well.position_x, y: well.position_y },
          type: 'well',
          readouts: '***',
          additive: '***',
          color_code: '***',
          label: '***',
        )
      end

      it 'returns a well with a sample' do
        expect(grape_entity_as_hash[:sample]).not_to be_empty
      end
    end

    context 'when entity is displayed in list' do
      let(:displayed_in_list) { true }
      let(:detail_level) { 10 }

      it 'returns a well without a sample' do
        expect(grape_entity_as_hash[:sample]).to eq(nil)
      end
    end
  end
end
