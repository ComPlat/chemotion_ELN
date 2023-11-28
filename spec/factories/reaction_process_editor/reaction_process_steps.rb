# frozen_string_literal: true

FactoryBot.define do
  factory :reaction_process_step, class: 'ReactionProcessEditor::ReactionProcessStep' do
    trait :with_vessel do
      vessel
    end

    reaction_process
    name { 'Example Step' }
    position { reaction_process.reaction_process_steps.count }
  end
end
