# frozen_string_literal: true

FactoryBot.define do
  trait :with_default_conditions do
    default_conditions { { PRESSURE: { value: 3000, unit: 'MBAR' } } }
  end

  trait :has_provenance do
    provenance
  end

  trait :in_collection do
    transient do
      creator { association :person }
      collection { association :collection, user_id: creator.id }
    end

    after(:create) do |reaction_process, obj|
      reaction_process.reaction.update(creator: obj.creator)
      reaction_process.reaction.collections << obj.collection
    end
  end

  factory :reaction_process, class: 'ReactionProcessEditor::ReactionProcess' do
    reaction { association :valid_reaction }
  end
end
