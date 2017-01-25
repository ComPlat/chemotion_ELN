FactoryGirl.define do
  factory :device do
    sequence(:code) { |n| "Code #{n}" }
    sequence(:title) { |n| "Title #{n}" }
  end
end
