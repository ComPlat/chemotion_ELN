# frozen_string_literal: true

require 'rails_helper'

describe Entities::CollectionEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(
        collection,
      )
    end

    let(:collection) { create(:collection) }

    context 'with no acl entry' do
      it 'returns the correct attributes' do
        expect(grape_entity_as_hash).to include(
          :id,
          :label,
          :ancestry,
          :user_id,
          :is_locked,
        )
      end
    end
  end
end
