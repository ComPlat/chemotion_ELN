FactoryBot.define do
  factory :group do
    sequence(:email) { |n| "group#{n}@foo.bar" }
    first_name { 'gro' }
    last_name { 'up' }
    sequence(:name_abbreviation) do |n|
      result = 'GU-LP'
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
