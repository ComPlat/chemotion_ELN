# frozen_string_literal: true

require 'rails_helper'

describe Entities::ComputedPropEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(
        computed_prop,
        displayed_in_list: displayed_in_list,
      )
    end

    let(:displayed_in_list) { false }
    let(:computed_prop) { create(:computed_prop) }

    context 'with any computed_prop entry' do
      it 'returns the correct attributes' do
        expect(grape_entity_as_hash).to include(
          :created_at,
          :data,
          :id,
          :sample_id,
          :task_id,
          :tddft,
          :updated_at,
        )
      end
    end

    context 'when entity is displayed in list' do
      let(:displayed_in_list) { true }

      it 'returns the correct attributes' do
        expect(grape_entity_as_hash).to include(
          :id,
          :status,
        )
      end
    end
  end
end
