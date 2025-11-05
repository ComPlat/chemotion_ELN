FactoryBot.define do
  factory :collection do
    sequence(:label) { |i| "Collection #{i}" }
    association :user, factory: :person
  end
end
