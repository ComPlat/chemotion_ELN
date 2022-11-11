# frozen_string_literal: true

FactoryBot.define do
  factory :sample_task do
    creator { create(:person) }

    trait :open do
      before(:create) do |sample_task, _evaluator|
        sample_task.sample ||= create(:valid_sample, creator: sample_task.creator)
      end
    end

    trait :open_free_scan do
      measurement_value { 123.45 }
      measurement_unit { 'mg' }
      description { 'description' }
      additional_note { 'additional note' }
      private_note { 'private note' }

      before(:create) do |sample_task, _evaluator|
        sample_task.attachment ||= create(:attachment, :with_image)
      end
    end

    trait :done do
      measurement_value { 123.45 }
      measurement_unit { 'mg' }
      description { 'description' }
      additional_note { 'additional note' }
      private_note { 'private note' }

      before(:create) do |sample_task, _evaluator|
        sample_task.sample ||= create(:valid_sample, creator: sample_task.creator)
        sample_task.attachment ||= create(:attachment, :with_image)
      end
    end
  end
end
