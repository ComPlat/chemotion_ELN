FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "foobar#{n}@bar.de" }
    first_name { 'first_name' }
    last_name { 'last_name' }
    name_abbreviation { "U#{SecureRandom.alphanumeric(2)}" }
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
