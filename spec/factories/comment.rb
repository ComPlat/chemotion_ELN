# frozen_string_literal: true

FactoryBot.define do
  factory :comment do
    transient do
      user_id { 0 }
    end
    created_by { user_id }
  end
end
