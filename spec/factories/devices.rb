FactoryBot.define do

  factory :device do
    sequence(:email) { |n| "group#{n}@foo.bar" }
    first_name { 'Device' }
    last_name { 'One' }
    sequence(:name_abbreviation) do |n|
      result = 'Dev1'
      n.times { result.succ! }
      result
    end
    password { 'testtest' }
    password_confirmation { 'testtest' }
    counters { {
      samples: 0,
      reactions: 0,
      wellplates: 0,
    } }
  end
end
