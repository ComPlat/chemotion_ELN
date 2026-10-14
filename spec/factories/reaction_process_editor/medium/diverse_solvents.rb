# frozen_string_literal: true

FactoryBot.define do
  factory :diverse_solvent, class: 'Medium::DiverseSolvent' do
    sequence(:name) { |i| "DiverseSolvent #{i}" }
  end
end
