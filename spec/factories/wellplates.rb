FactoryBot.define do
  factory :wellplate do
    sequence(:name) { |i| "Wellplate #{i}" }
    description {{ "ops" => [{ "insert" => "I am description" }] }}
  end
end
