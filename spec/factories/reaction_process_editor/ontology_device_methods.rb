# frozen_string_literal: true

FactoryBot.define do
  factory :ontology_device_method, class: 'ReactionProcessEditor::OntologyDeviceMethod' do
    ontology { association :ontology }
    sequence(:label) { |index| "Method #{index}" }
  end
end
