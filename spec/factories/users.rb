FactoryGirl.define do
  factory :user do
    sequence(:email) { |n| "foo#{n}@bar.de" }
    first_name 'first_name'
    last_name 'last_name'
    password 'testtest'
    password_confirmation 'testtest'
  end
end
