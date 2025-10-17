# frozen_string_literal: true

FactoryBot.define do
  factory :chemical do
    association :sample

    trait :for_manual_sds_testing do
      id { 1 }
      sample_id { build(:valid_sample).id }
      cas { '123-45-6' }
      chemical_data { [{ 'safetySheetPath' => [] }] }
    end
  end
end
