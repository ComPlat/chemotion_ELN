# frozen_string_literal: true

FactoryBot.define do
  factory :vessel do
    creator { create(:person) }
    vessel_template { create(:vessel_template) }
    name {''}
    description {''}
  end
end