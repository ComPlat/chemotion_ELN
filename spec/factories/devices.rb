FactoryBot.define do
  factory :device do
    sequence(:email) { |n| "group#{n}@foo.bar" }
    first_name { 'Device' }
    last_name { 'One' }
    name_abbreviation { "D#{SecureRandom.alphanumeric(3)}" }
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
