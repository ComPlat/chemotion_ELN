# frozen_string_literal: true

FactoryBot.define do
  factory :research_plan do
    sequence(:name) { |i| "Research plan #{i}" }

    body do
      [
        { "id"=>SecureRandom.uuid,
          "type"=>"richtext",
          "value"=>{ "ops"=>[{ "insert"=>"some text here\n" }] } }
      ]
    end

    callback(:before_create) do |research_plan|
      research_plan.creator = FactoryBot.build(:user) unless research_plan.creator
      research_plan.container = FactoryBot.build(:container) unless research_plan.container
    end

    factory :valid_research_plan do
      after(:build) do |research_plan|
        collection = FactoryBot.create(:collection, user_id: creator.id)
        research_plan.collections << collection if research_plan.collections.blank?
        research_plan.container = FactoryBot.build(:container) unless research_plan.container
      end
    end
  end
end
