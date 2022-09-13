# frozen_string_literal: true

FactoryBot.define do
  factory :attachment do
    key { nil }
    filename { 'upload.txt' }
    created_by { 0 }
    file_data { File.read("#{Rails.root}/spec/fixtures/upload.txt") }
    association :attachable, factory: :container

    trait :with_image do
      filename { 'upload.jpg' }
      file_path { File.join("#{Rails.root}/spec/fixtures/upload.jpg") }
    end

    trait :with_png_image do
      filename { 'upload.png' }
      file_path { File.join("#{Rails.root}/spec/fixtures/upload.png") }
    end

    trait :with_spectra_file do
      filename { 'spectra_file.jdx' }
      file_path { Rails.root.join('spec', 'fixtures', 'spectra_file.jdx') }
    end

    trait :with_json_file do
      filename { 'upload.json' }
      file_path { Rails.root.join('spec', 'fixtures', 'upload.json') }
    end

    trait :with_csv_file do
      filename { 'upload.csv' }
      file_path { Rails.root.join('spec', 'fixtures', 'upload.csv') }
    end

    trait :attached_to_container do
      association :attachable, factory: :container
    end

    trait :attached_to_research_plan do
      association :attachable, factory: :research_plan
    end
  end
end
