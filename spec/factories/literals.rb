FactoryBot.define do
  factory :literal do
    category 'detail'
    user factory: :person
    element factory: :reaction
  end
end
