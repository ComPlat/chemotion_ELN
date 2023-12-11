# frozen_string_literal: true

FactoryBot.define do
  factory :device_description do
    sequence(:name) { |i| "Device description #{i}" }
    sequence(:short_label) { |i| "DD#{i}" }
    serial_number { '123abc456def' }
  end
end
