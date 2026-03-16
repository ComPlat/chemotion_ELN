# frozen_string_literal: true

FactoryBot.define do
  factory :collection_share do
    collection { build(:collection) }
    shared_with { build(:person) }

    permission_level { 10 }
    celllinesample_detail_level { 10 }
    devicedescription_detail_level { 10 }
    element_detail_level { 10 }
    reaction_detail_level { 10 }
    researchplan_detail_level { 10 }
    sample_detail_level { 10 }
    screen_detail_level { 10 }
    sequencebasedmacromoleculesample_detail_level { 10 }
    wellplate_detail_level { 10 }
  end
end
