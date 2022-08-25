# frozen_string_literal: true

FactoryBot.define do
  factory :attachment do
    key { nil }
    filename { 'upload.txt' }
    created_by { 0 }
    file_data { File.read("#{Rails.root}/spec/fixtures/upload.txt") }
    association :attachable, factory: :container

    trait :with_image do
      key { SecureRandom.uuid }
      filename { 'upload.jpg' }
      file_path { File.join("#{Rails.root}/spec/fixtures/upload.jpg") }
    end

    trait :attached_to_container do
      association :attachable, factory: :container
    end

    trait :attached_to_research_plan do
      association :attachable, factory: :research_plan
    end
  end
end
