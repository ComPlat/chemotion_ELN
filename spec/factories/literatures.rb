FactoryBot.define do
  factory :literature do
    doi            { "doi:10.1006/jmbi.1998.2354" }
    sequence(:title) { |n| "Title #{n}" }
    sequence(:url) { |n| "www.#{n}" }

    factory :literature_for_reaction do
      after(:create) do |literature|
        reaction = create(:reaction)
        create(:literal, user: reaction.creator, literature: literature, element: reaction)
      end
    end
  end
end
