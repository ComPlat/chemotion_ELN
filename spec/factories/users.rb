FactoryGirl.define do
  factory :user do
    sequence(:email) { |n| "foo#{n}@bar.de" }
    password 'testtest'
    password_confirmation 'testtest'
  end
end
