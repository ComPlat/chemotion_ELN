# frozen_string_literal: true

FactoryBot.define do
  factory :measurement do
    sequence(:value) { |i| i }
    unit { 'g' }
    sequence(:description) { |i| "Measurement Description #{i}"}
    sample { build(:sample) }
  end
end
