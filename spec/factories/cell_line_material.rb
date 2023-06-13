# frozen_string_literal: true

FactoryBot.define do
  factory :cellline_material do
    name { 'name-001' }
    cell_type { 'primary cells' }
    growth_medium { 'primary cells' }
    source { 'IPB' }
    organism { 'mouse' }
    tissue { 'leg' }
    disease { 'cancer' }
    biosafety_level { 'S0' }
    variant { 'v0' }
    optimal_growth_temp { 36.3 }
    cryo_pres_medium { 'nitrogen' }
    gender { 'male' }
    description { 'a cell' }
  end
end
