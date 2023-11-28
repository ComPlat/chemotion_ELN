# frozen_string_literal: true

FactoryBot.define do
  factory :medium_sample, class: 'Medium::MediumSample' do
    sequence(:sample_name) { |i| "MediumSample #{i}" }

    factory :medium
  end
end
