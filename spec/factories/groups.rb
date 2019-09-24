FactoryBot.define do
  factory :group do
    sequence(:email) { |n| "group#{n}@foo.bar" }
    first_name { 'gro' }
    last_name { 'up' }
    name_abbreviation { "G#{SecureRandom.alphanumeric(3)}" }
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
