# frozen_string_literal: true

FactoryBot.define do
  factory :vessel do
    creator factory: :person
    vessel_template
    sequence(:name) { |n| "Vessel #{n}" }
    description { 'Big vessel for all kinds of activity' }
  end
end
