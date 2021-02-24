FactoryBot.define do
    factory :private_note do
      transient do
        user_id { 0 }
      end
      created_by { user_id }
    end
end