# frozen_string_literal: true

FactoryBot.define do
  factory :chemical do
    association :sample
    # transient do
    #   sample_id { sample.id }
    # end
  end
end
