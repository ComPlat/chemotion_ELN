FactoryBot.define do
  factory :sync_collections_user do
    user_id { 10_000 }

    permission_level { 0 }
    sample_detail_level { 0 }
    reaction_detail_level { 0 }
    wellplate_detail_level { 0 }
    screen_detail_level { 0 }
  end
end
