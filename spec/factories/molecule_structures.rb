# frozen_string_literal: true

# those require statements are uneccessary in test environment but
# enable the single factory to be loaded in development environment
require 'faker'
require 'factory_bot'

FactoryBot.define do
  trait :smiles_from do
    transient do
      from { 'smiles' }
    end
  end

  trait :smiles_set_dict do
    transient do
      root_dictionary { JSON.parse(Rails.root.join("spec/fixtures/structures/#{from}.json").read) }
      dictionary { root_dictionary }
    end
  end

  factory :smiles_set, class: Hash do
    smiles_from
    smiles_set_dict
    initialize_with { dictionary }
  end

  trait :smiles_set_random_key do
    transient do
      key { dictionary.keys.sample }
    end
  end

  factory :smiles, parent: :smiles_set, class: String do
    smiles_set_random_key
    initialize_with { dictionary[key] }
  end

  factory :faulty_smiles, parent: :smiles, class: String do
    transient do
      from { 'smiles_faulty' }
    end
  end
end
