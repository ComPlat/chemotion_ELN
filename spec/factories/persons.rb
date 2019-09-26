FactoryBot.define do
  factory :person do
    sequence(:email) { |n| "J#{n}.doe@foo.bar" }
    first_name { 'John' }
    last_name { 'Doe' }
    name_abbreviation { "P#{SecureRandom.alphanumeric(2)}" }
    password { 'testtest' }
    password_confirmation { 'testtest' }
    counters do
      {
        samples: 0,
        reactions: 0,
        wellplates: 0
      }
    end
  end
end
