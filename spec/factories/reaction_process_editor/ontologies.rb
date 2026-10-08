# frozen_string_literal: true

FactoryBot.define do
  factory :ontology, class: 'ReactionProcessEditor::Ontology' do
    sequence(:ontology_id) { |index| "ONT:#{index}" }
    label { 'Ontology' }
    name { label }
    active { true }
  end
end
