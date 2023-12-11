# frozen_string_literal: true

FactoryBot.define do
  factory :samples_preparation, class: 'ReactionProcessEditor::SamplesPreparation' do
    sample
    reaction_process
    preparations { %w[DEGASSED DRYING] }
    equipment { %w[FUNNEL REACTOR] }
    details { 'Sample Preparation Details' }
  end
end
