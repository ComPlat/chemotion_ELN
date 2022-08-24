# frozen_string_literal: true

FactoryBot.define do
  factory :attachment do
    #  container_id nil
    filename { 'upload.txt' }
    #  identifier nil
    #  checksum nil
    #  storage nil
    created_by { 0 }
    #  created_for nil
    #  version nil

    #  content_type nil
    #  bucket nil
    #  key nil

    file_data { File.read("#{Rails.root}/spec/fixtures/upload.txt") }
    file_path { File.join("#{Rails.root}/spec/fixtures/upload.txt") }

    association :attachable, factory: :container

    trait :with_image do
      key { SecureRandom.uuid }
      filename { 'upload.jpg' }
      file_data { File.read("#{Rails.root}/spec/fixtures/upload.jpg") }
      file_path { File.join("#{Rails.root}/spec/fixtures/upload.jpg") }
    end

    trait :attached_to_container do
      association :attachable, factory: :container
    end

    trait :attached_to_research_plan do
      association :attachable, factory: :research_plan
    end

    trait :attached_to_report do
      association :attachable, factory: :report
    end

    trait :attached_to_template do
      association :attachable, factory: :text_template
    end
  end
end
