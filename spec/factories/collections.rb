FactoryBot.define do
  factory :collection do
    sequence(:label) { |i| "Collection #{i}" }
  end
end
