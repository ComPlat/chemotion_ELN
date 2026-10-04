# frozen_string_literal: true

FactoryBot.define do
  factory :reaction_process_defaults, class: 'ReactionProcessEditor::ReactionProcessDefaults' do
    user
    default_conditions { { TEMPERATURE: { value: 21, unit: 'CELSIUS' } } }
  end
end
