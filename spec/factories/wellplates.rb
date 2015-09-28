FactoryGirl.define do
  factory :wellplate do
    sequence(:name) { |i| "Wellplate #{i}" }
  end
end
