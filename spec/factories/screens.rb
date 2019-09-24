FactoryBot.define do
  factory :screen do
    sequence(:name) { |i| "Screen #{i}" }
    description { { 'ops' => [{ 'insert' => 'I am description' }] } }
  end
end
