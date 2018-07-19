FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "foobar#{n}@bar.de" }
    first_name 'first_name'
    last_name 'last_name'
    sequence(:name_abbreviation) do |n|
      result = 'FL'
      n.times { result.succ! }
      result
    end
    password 'testtest'
    password_confirmation 'testtest'
    counters({
      samples: 0,
      reactions: 0,
      wellplates: 0
    })
  end
end
