# frozen_string_literal: true

FactoryBot.define do
  factory :vessel do
    creator factory: :person
    vessel_template
    name { 'Vessel 1' }
    description { 'description of vessel usage' }
  end
end
