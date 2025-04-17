# frozen_string_literal: true

# require 'Faker'

FactoryBot.define do
  factory :code_log do
    id { SecureRandom.uuid }
    source { %w[sample reaction wellplate].sample }
    source_id { Random.rand(1..1000) }
    value { Faker::Number.number(digits: 40) }
    created_at { Time.current }
    updated_at { Time.current }
  end
end
