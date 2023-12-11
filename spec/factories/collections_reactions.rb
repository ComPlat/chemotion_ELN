FactoryBot.define do
  factory :collection_reaction do
    collection
    reaction { association :valid_reaction }
  end
end
