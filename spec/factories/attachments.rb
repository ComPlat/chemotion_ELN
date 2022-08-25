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

    association :attachable, factory: :container

    after :create do |attachment|
      # we have to clear the file_data and file_path variables that have been set
      # during creation. Leaving them messes with the write_file method of the Tmp storage.

      attachment.reload
    end

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
