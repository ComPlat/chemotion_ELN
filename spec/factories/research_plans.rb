FactoryBot.define do
  factory :research_plan do
    sequence(:name) { |i| "Research plan #{i}" }

    callback(:before_create) do |research_plan|
      research_plan.creator = FactoryBot.build(:user) unless research_plan.creator
    end
  end
end
