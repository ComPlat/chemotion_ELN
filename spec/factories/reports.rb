# frozen_string_literal: true

FactoryBot.define do
  factory :report do
    transient do
      user { create(:user) }
    end

    trait :downloadable do
      generated_at { Time.zone.now }
    end

    trait :undownloadable do
      generated_at { nil }
    end

    author_id { user.id }
    file_name { 'ELN_Report' }
    file_description { 'This is description' }
    img_format { 'png' }
    configs { { page_break: true, whole_diagram: true } }
    sample_settings do
      { diagram: true, collection: true,
        analyses: true, reaction_description: true }
    end
    reaction_settings do
      { diagram: true,
        material: true,
        description: true,
        purification: true,
        tlc: true,
        observation: true,
        analysis: true,
        literature: true,
        variations: true }
    end
    objects do
      [
        # ActiveSupport::HashWithIndifferentAccess.new(id: 4, type: 'sample'),
      ]
    end

    after(:create) do |report, elevator|
      elevator.user.reports << report
    end
  end
end
