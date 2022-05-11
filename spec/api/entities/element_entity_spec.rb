# frozen_string_literal: true

require 'rails_helper'

describe Entities::ElementEntity do

  # TODO: Remove this context when all AMS Serializers have been ported to Grape::Entity
  context 'when comparing to the ElementSerializer' do
    let(:timestamp) { DateTime.current }
    let(:object) do
      Element.new(
        created_at: timestamp,
        element_klass: nil,
        id: 666,
        name: 'Element',
        properties: {},
        short_label: 'SL1',
        updated_at: timestamp,
      )
    end
    let(:entity) { described_class.represent(object) }
    let(:serializer) { ElementSerializer.new(object) }

    it 'returns the same result' do
      pending("Discuss why ElementKlassEntity differs from result of serializing element_class in ElementSerializer")
      expect(entity).to serialize_equally_to(serializer)
    end
  end
end
