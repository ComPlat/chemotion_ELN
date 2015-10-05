FactoryGirl.define do
  factory :screen do
    sequence(:name) { |i| "Screen #{i}" }
  end
end
