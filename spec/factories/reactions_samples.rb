# frozen_string_literal: true

FactoryBot.define do
  factory :reactions_sample do
    association :reaction
    association :sample
    reference { false }
    equivalent { 1.0 }
    conversion_rate { 1.0 }
    position { 0 }
    type { 'ReactionsSample' }
    waste { false }
    coefficient { 1.0 }
    show_label { false }

    factory :reactions_starting_material_sample, class: 'ReactionsStartingMaterialSample' do
      type { 'ReactionsStartingMaterialSample' }
    end

    factory :reactions_reactant_sample, class: 'ReactionsReactantSample' do
      type { 'ReactionsReactantSample' }
    end

    factory :reactions_solvent_sample, class: 'ReactionsSolventSample' do
      type { 'ReactionsSolventSample' }
    end

    factory :reactions_purification_solvent_sample, class: 'ReactionsPurificationSolventSample' do
      type { 'ReactionsPurificationSolventSample' }
    end

    factory :reactions_product_sample, class: 'ReactionsProductSample' do
      type { 'ReactionsProductSample' }
    end
  end
end
