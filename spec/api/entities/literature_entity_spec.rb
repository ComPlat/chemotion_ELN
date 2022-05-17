# frozen_string_literal: true

require 'rails_helper'

describe Entities::LiteratureEntity do

  # TODO: Remove this context when all AMS Serializers have been ported to Grape::Entity
  context 'when comparing to the LiteratureSerializer' do
    let(:timestamp) { DateTime.current }
    let(:literature) { build(:literature, id: 666, created_at: timestamp, updated_at: timestamp) }
    let(:entity) { described_class.represent(literature) }
    let(:serializer) { LiteratureSerializer.new(literature) }

    it 'returns the same result' do
      expect(entity).to serialize_equally_to(serializer)
    end
  end
end
