# frozen_string_literal: true

FactoryBot.define do
  factory :device_description do
    sequence(:name) { |i| "Device description #{i}" }
    sequence(:short_label) { |i| "CU1-DD#{i}" }
    serial_number { '123abc456def' }
    collection_id { 1 }
    created_by { 1 }

    callback(:before_create) do |device_description|
      device_description.created_by = FactoryBot.build(:user) unless device_description.created_by
      device_description.collections << FactoryBot.build(:collection)
      # device_description.container = FactoryBot.create(:container, :with_analysis) unless device_description.container
    end
  end
end
