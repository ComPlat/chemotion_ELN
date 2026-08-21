# frozen_string_literal: true

FactoryBot.define do
  factory :llm_provider do
    sequence(:name) { |n| "Test Provider #{n}" }
    base_url      { 'https://ki-toolbox.scc.kit.edu/api' }
    api_key       { 'sk-test-key-1234' }
    default_model { 'kit.qwen3.5-397b-A17b' }
    enabled       { true }

    # One user's own provider (LlmProvider scope 'user') rather than the
    # institution one — pass the owner: create(:llm_provider, :personal, user: u).
    trait :personal do
      scope { 'user' }
      association :user
      sequence(:name) { |n| "My Provider #{n}" }
    end

    trait :disabled do
      enabled { false }
    end
  end
end
