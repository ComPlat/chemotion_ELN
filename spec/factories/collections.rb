FactoryGirl.define do
  factory :collection do
    user_id 10000
    sequence(:label) { |i| "Collection #{i}" }

    permission_level 0
    sample_detail_level 1
    reaction_detail_level 2
    wellplate_detail_level 3
  end
end
