# frozen_string_literal: true

# rubocop:disable FactoryBot/FactoryAssociationWithStrategy, Lint/RedundantCopDisableDirective

FactoryBot.define do
  factory :cellline_sample do
    creator { create(:person) }
    cellline_material { create(:cellline_material) }
    amount { 999 }
    passage { 10 }
    unit { 'g' }
    description { 'description' }
    contamination { 'contamination' }
    name { 'name' }
    sequence(:short_label) { |i| "C#{i}" }
    container { FactoryBot.create(:container, :with_analysis) }
  end

  trait :with_analysis do
    callback(:before_create) do |cell_line|
      user = cell_line.creator || FactoryBot.create(:user)
      cell_line.container = FactoryBot.create(:container, :with_jpg_in_dataset, user_id: user.id)
    end
  end
end
# rubocop:enable FactoryBot/FactoryAssociationWithStrategy, Lint/RedundantCopDisableDirective
