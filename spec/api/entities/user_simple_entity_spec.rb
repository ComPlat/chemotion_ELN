# frozen_string_literal: true

require 'rails_helper'

describe Entities::UserSimpleEntity do

  # TODO: Remove this context when all AMS Serializers have been ported to Grape::Entity
  context 'when comparing to the UserSimpleSerializer' do
    let(:user) { build(:user, id: 666, name: 'Vorname Nachname', type: 'User') }
    let(:entity) { described_class.represent(user) }
    let(:serializer) { UserSimpleSerializer.new(user) }

    it 'returns the same result' do
      expect(entity).to serialize_equally_to(serializer)
    end
  end
end
