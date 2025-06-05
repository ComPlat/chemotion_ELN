# frozen_string_literal: true

FactoryBot.define do
  factory :component do
    association :sample
    name { 'Sample Component' }
    position { 1 }
    component_properties { { 'molecule_id' => create(:molecule).id, 'purity' => 0.99 } }
  end
end
