FactoryBot.define do
  factory :person do
    sequence(:email) { |n| "J#{n}.doe@foo.bar" }
    first_name { 'John' }
    last_name { 'Doe' }
    sequence(:name_abbreviation) do |n|
      result = 'J_D'
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
