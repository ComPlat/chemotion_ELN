# frozen_string_literal: true

FactoryBot.define do
  factory :reactions_sample, class: 'ReactionsSample' do
    association :reaction
    association :sample
    reference { false }
    equivalent { 1.0 }
    conversion_rate { 1.0 }
    position { 0 }
    waste { false }
    coefficient { 1.0 }
    show_label { false }

    factory :reactions_starting_material_sample, class: 'ReactionsStartingMaterialSample'

    factory :reactions_reactant_sample, class: 'ReactionsReactantSample'

    factory :reactions_solvent_sample, class: 'ReactionsSolventSample'

    factory :reactions_purification_solvent_sample, class: 'ReactionsPurificationSolventSample'

    factory :reactions_product_sample, class: 'ReactionsProductSample'

    factory :reactions_intermediate_sample, class: 'ReactionsIntermediateSample' do
      intermediate_type {'Intermediate'}
    end
  end
end
