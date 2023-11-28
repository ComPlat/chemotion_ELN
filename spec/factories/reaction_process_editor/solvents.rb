# frozen_string_literal: true

FactoryBot.define do
  factory :solvent, parent: :sample do
    sequence(:name) { |i| "Solvent #{i}" }
  end
end
