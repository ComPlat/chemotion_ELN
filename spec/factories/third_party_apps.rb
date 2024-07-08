# frozen_string_literal: true

FactoryBot.define do
  factory :third_party_app do
    sequence(:id) { |i| i }
    url { "myUrl#{id}" }
    name { "myName #{id}" }
    created_at { Date.new }
    updated_at { Date.new }
  end
end
