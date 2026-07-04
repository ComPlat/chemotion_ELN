# frozen_string_literal: true

FactoryBot.define do
  factory :user_llm_setting do
    association :user

    provider_type { 'custom' }
    base_url      { 'https://ki-toolbox.scc.kit.edu/api' }
    api_key       { 'sk-test-key-1234' }
    default_model { 'kit.qwen3.5-397b-A17b' }
    enabled       { true }

    trait :global do
      provider_type { 'global' }
      base_url      { nil }
      api_key       { nil }
      default_model { nil }
    end

    trait :disabled do
      enabled { false }
    end
  end

  factory :user_task_model_mapping do
    association :user

    task_name { 'sds_extraction' }
    model     { 'kit.qwen3.5-397b-A17b' }
  end
end
