# frozen_string_literal: true

FactoryBot.define do
  factory :llm_provider do
    sequence(:name) { |n| "Test Provider #{n}" }
    base_url      { 'https://ki-toolbox.scc.kit.edu/api' }
    api_key       { 'sk-test-key-1234' }
    default_model { 'kit.qwen3.5-397b-A17b' }
    enabled       { true }

    trait :disabled do
      enabled { false }
    end
  end
end
