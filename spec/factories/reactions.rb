FactoryGirl.define do
  factory :reaction do
    sequence(:name) { |i| "Reaction #{i}" }
  end
end
