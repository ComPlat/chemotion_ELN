# frozen_string_literal: true

FactoryBot.define do
  factory :affiliation_suggestion do
    organization { 'KIT' }
    department { 'IOC' }
    group { nil }
    country { 'Germany' }
    status { :pending }
    association :user, factory: :person
  end
end
