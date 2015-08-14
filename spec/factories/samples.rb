FactoryGirl.define do
  factory :sample do
    sequence(:name) { |i| "Sample #{i}" }

    amount_value 100
    amount_unit "mg"
    
  end
end
