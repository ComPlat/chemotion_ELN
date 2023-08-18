# frozen_string_literal: true

require 'rails_helper'

describe Entities::CollectionAclEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(
        collection_acl,
      )
    end

    let(:collection_acl) { create(:collection) }

    context 'with no acl entry' do
      it 'returns the correct attributes' do
        expect(grape_entity_as_hash).to include(
          :id,
        )
      end
    end
  end
end
