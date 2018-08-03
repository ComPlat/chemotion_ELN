FactoryBot.define do
  factory :collection do
    user_id 10000
    sequence(:label) { |i| "Collection #{i}" }

    permission_level 0
    sample_detail_level 0
    reaction_detail_level 0
    wellplate_detail_level 0
    screen_detail_level 0

    callback(:before_create) do |col|
      col.sample_detail_level = 10 unless col.is_shared
    end
  end
end
