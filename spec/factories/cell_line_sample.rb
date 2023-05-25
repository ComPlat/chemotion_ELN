# frozen_string_literal: true

FactoryBot.define do
  factory :cellline_sample do
    creator { create(:person) }
    cellline_material { create(:cellline_material) }
    amount {999}
    passage {10}
  end
end
