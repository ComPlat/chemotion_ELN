# frozen_string_literal: true

FactoryBot.define do
  factory :chemical do
    association :sample
  end
end
