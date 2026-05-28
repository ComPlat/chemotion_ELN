# frozen_string_literal: true

require 'rails_helper'
RSpec.describe Usecases::DeviceDescriptions::ByUIState do
  let(:user) { create(:user) }
  let(:collection) { create(:collection, user_id: user.id) }
  let(:device_description_b) do
    create(:device_description, collection_id: collection.id, created_by: collection.user_id)
  end
  let(:device_description_d) do
    create(:device_description, collection_id: collection.id, created_by: collection.user_id)
  end
  let(:device_description_c) do
    create(
      :device_description, collection_id: collection.id, created_by: collection.user_id, device_class: 'setup',
                           setup_descriptions: {
                             setup: [
                               {
                                 device_description_id: device_description_d.id,
                               },
                             ],
                           }
    )
  end
  let(:device_description_a) do
    create(
      :device_description, collection_id: collection.id, created_by: collection.user_id, device_class: 'setup',
                           setup_descriptions: {
                             setup: [
                               {
                                 device_description_id: device_description_b.id,
                               },
                               {
                                 device_description_id: device_description_c.id,
                               },
                             ],
                           }
    )
  end

  describe '#with_joined_ids' do
    it 'adds ids by joined device descriptions' do
      ids = [device_description_a.id]
      joined_ids = described_class.new(ids).with_joined_ids
      new_ids = [device_description_a.id, device_description_b.id, device_description_c.id, device_description_d.id]

      expect(joined_ids).to match_array(new_ids)
    end
  end
end
