# frozen_string_literal: true

FactoryBot.define do
  factory :vessel_template do
    name { 'Vessel Template 1' }
    details { 'multi-neck' }
    vessel_type { 'round bottom flask' }
    volume_amount { 500 }
    volume_unit { 'ml' }
    material_type { 'glass' }
    material_details { 'other material details' }
  end
end
