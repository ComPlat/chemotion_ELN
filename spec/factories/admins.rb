FactoryBot.define do
  factory :admin, class: 'Admin', parent: :user do
    type { 'Admin' }
  end
end