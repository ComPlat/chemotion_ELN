# frozen_string_literal: true

FactoryBot.define do
  factory :reaction_process_activity, class: 'ReactionProcessEditor::ReactionProcessActivity' do
    trait :with_sample do
      transient do
        sample { association :sample }
        workup_defaults { { target_amount: { value: '500', unit: 'ml' }, acts_as: 'SAMPLE', sample_id: sample.id } }
      end

      after :build do |action, obj|
        action.workup = obj.workup_defaults.merge(action.workup || {}).deep_stringify_keys
      end
    end

    trait :with_medium do
      transient do
        medium { association :medium }
        workup_defaults { { target_amount: { value: '200', unit: 'mg' }, acts_as: 'MEDIUM', sample_id: medium.id } }
      end

      after :build do |action, obj|
        action.workup = obj.workup_defaults.merge(action.workup || {}).deep_stringify_keys
      end
    end

    reaction_process_step
    position { reaction_process_step.reaction_process_activities.count }
    workup { {} }

    factory :reaction_process_activity_add_sample do
      with_sample
      activity_name { 'ADD' }
      workup { { acts_as: 'SAMPLE' } }
    end

    factory :reaction_process_activity_add_solvent do
      with_sample
      activity_name { 'ADD' }
      workup { { acts_as: 'SOLVENT' } }
    end

    factory :reaction_process_activity_add_medium do
      with_medium
      activity_name { 'ADD' }
      medium { association :medium_sample }
      workup { { acts_as: 'MEDIUM' } }
    end

    factory :reaction_process_activity_add_diverse_solvent do
      with_medium
      medium { association :diverse_solvent }
      activity_name { 'ADD' }
      workup { { acts_as: 'DIVERSE_SOLVENT' } }
    end

    factory :reaction_process_activity_add_additive do
      with_medium
      medium { association :additive }
      activity_name { 'ADD' }
      workup { { acts_as: 'ADDITIVE' } }
    end

    factory :reaction_process_activity_save do
      with_sample
      activity_name { 'SAVE' }
      workup { { intermediate_type: 'INTERMEDIATE' } }

      after :create do |activity|
        create(:intermediate_sample, sample: activity.sample,
                                     reaction_process_step_id: activity.reaction_process_step_id)
      end
    end

    factory :reaction_process_activity_condition do
      activity_name { 'CONDITION' }
      workup do
        { TEMPERATURE: { value: '666', unit: 'CELSIUS' },
          PRESSURE: { value: '999', unit: 'MBAR' } }
      end
    end
  end
end
