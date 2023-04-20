# frozen_string_literal: true

FactoryBot.define do
  factory :computed_prop do
    user factory: :person
    molecule factory: :molecule
  end
end
