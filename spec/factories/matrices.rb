# frozen_string_literal: true

FactoryBot.define do
  factory :matrice do
    name { Faker::Name.name }
    label { name }
    include_ids { [] }
    exclude_ids { [] }
    configs { { 'description' => Faker::Lorem.sentence } }
    enabled { [true, false].sample }

    trait :disabled do
      enabled { false }
    end

    trait :enabled do
      enabled { true }
    end
  end
end
