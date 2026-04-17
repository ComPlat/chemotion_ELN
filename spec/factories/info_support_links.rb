# frozen_string_literal: true

FactoryBot.define do
  factory :info_support_link, class: 'InfoSupportLink' do
    sequence(:label) { |n| "Local resource #{n}" }
    sequence(:url) { |n| "https://example.org/resource-#{n}" }
    position { 0 }
    enabled { true }
  end
end
