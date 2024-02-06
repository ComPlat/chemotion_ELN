# frozen_string_literal: true

FactoryBot.define do
  factory :comment do
    transient do
      user { create(:user) }
    end
    created_by { user.id }
  end
end
