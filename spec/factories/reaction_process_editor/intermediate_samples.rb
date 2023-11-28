# frozen_string_literal: true

FactoryBot.define do
  factory :intermediate_sample, class: 'ReactionsIntermediateSample' do
    sample
    reaction_process_step

    intermediate_type { 'CRUDE' }

    reaction { reaction_process_step.reaction }
  end
end
