FactoryGirl.define do
  factory :sample do
    sequence(:name) { |i| "Sample #{i}" }

    target_amount_value 100
    target_amount_unit "mg"

  end
end
