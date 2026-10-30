# frozen_string_literal: true

FactoryBot.define do
  factory :intermediate_sample, class: 'ReactionsIntermediateSample' do
    sample
    reaction_process_activity

    intermediate_type { 'CRUDE' }

    reaction { reaction_process_activity.reaction }
  end
end
