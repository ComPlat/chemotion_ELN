# frozen_string_literal: true

FactoryBot.define do
  factory :calendar_entry do
    title { 'test title' }
    description { 'test description' }
    start_time { Time.current }
    end_time { 2.hours.from_now }
    kind { 'reminder' }
    creator factory: :person

    trait :sample do
      eventable factory: :sample
    end

    trait :reaction do
      eventable factory: :reaction
    end

    trait :wellplate do
      eventable factory: :wellplate
    end

    trait :screen do
      eventable factory: :screen
    end

    trait :research_plan do
      eventable factory: :screen
    end

    trait :element do
      eventable { Element.create(element_klass: ElementKlass.create, creator: create(:person)) }
    end
  end
end
