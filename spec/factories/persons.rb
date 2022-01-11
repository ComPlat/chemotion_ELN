FactoryBot.define do
  factory :person do
    sequence(:email) { |n| "J#{n}.doe@foo.bar" }
    first_name { 'John' }
    last_name { 'Doe' }
    sequence(:name_abbreviation) { "P#{SecureRandom.alphanumeric(2)}" }
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

#  factory :admin do
#    sequence(:email) { |n| "Admin-#{n}@foo.bar" }
#    first_name { 'Don' }
#    last_name { 'Admin' }
#    name_abbreviation { "P#{SecureRandom.alphanumeric(2)}" }
#    password { 'testtest' }
#    password_confirmation { 'testtest' }
#  end
end
