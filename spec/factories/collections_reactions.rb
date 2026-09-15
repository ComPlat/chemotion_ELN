# frozen_string_literal: true

FactoryBot.define do
  factory :collection_reaction do
    collection
    reaction { association :valid_reaction }
  end
end
