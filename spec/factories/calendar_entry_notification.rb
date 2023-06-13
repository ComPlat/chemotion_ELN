# frozen_string_literal: true

FactoryBot.define do
  factory :calendar_entry_notification do
    user factory: :person
    calendar_entry factory: :calendar_entry
  end
end
