# frozen_string_literal: true

FactoryBot.define do
  factory :vessel_template do
    name {'Vessel Template 1'}
    details {'multi-neck'}
    vessel_type {'round bottom flask'}
    volume_unit {'ml'}
    volume_amount {'500'}
    material_type {'glass'}
    material_details {'other material details'}
  end
end