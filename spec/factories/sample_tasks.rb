# frozen_string_literal: true

FactoryBot.define do
  factory :sample_task do
    creator { create(:person) }
    required_scan_results { 1 }

    trait :single_scan do
      required_scan_results { 1 }
    end

    trait :double_scan do
      required_scan_results { 2 }
    end

    trait :with_sample do
      before(:create) do |sample_task, _evaluator|
        sample_task.sample ||= create(:valid_sample, creator: sample_task.creator)
      end
    end

    trait :with_result_data do
      result_value { 123 }
      result_unit { 'g' }
    end

    trait :with_scan_results do
      transient do
        scan_result_count { required_scan_results }
      end

      after(:build) do |sample_task, evaluator|
        evaluator.scan_result_count.times do |counter|
          sample_task.scan_results.build(
            attachment_attributes: attributes_for(:attachment, :with_png_image),
            measurement_unit: 'g',
            measurement_value: 10 + counter,
            position: counter,
            title: "Scan Number #{counter + 1}",
          )
        end
      end
    end

    factory :sample_task_without_scan_results, traits: [:single_scan]
    factory :sample_task_with_incomplete_scan_results, traits: %i[double_scan with_scan_results] do
      scan_result_count { 1 }
    end
    factory :sample_task_with_only_missing_sample, traits: %i[single_scan with_scan_results]
    factory :sample_task_finished, traits: %i[single_scan with_sample with_scan_results with_result_data]
  end
end
