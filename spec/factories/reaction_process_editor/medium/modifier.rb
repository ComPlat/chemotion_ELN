# frozen_string_literal: true

FactoryBot.define do
  factory :modifier, class: 'Medium::Modifier' do
    sequence(:sample_name) { |i| "Modifier #{i}" }
  end
end
