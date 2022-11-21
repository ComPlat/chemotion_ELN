# frozen_string_literal: true

FactoryBot.define do
  factory :attachment do
    key { nil }
    filename { 'upload.txt' }
    file_path { Rails.root.join('spec/fixtures/upload.txt') }
    created_by { 0 }
    file_data { Rails.root.join('spec/fixtures/upload.txt').read }
    association :attachable, factory: :container

    trait :with_image do
      filename { 'upload.jpg' }
      file_path { Rails.root.join('spec/fixtures/upload.jpg') }
    end

    trait :with_png_image do
      filename { 'upload.png' }
      file_path { Rails.root.join('spec/fixtures/upload.png') }
    end

    trait :with_gif_image do
      filename { 'upload.gif' }
      file_path { Rails.root.join('spec/fixtures/upload.gif') }
    end

    trait :with_pdf do
      filename { 'upload.pdf' }
      file_path { Rails.root.join('spec/fixtures/upload.pdf') }
    end

    trait :with_spectra_file do
      filename { 'spectra_file.jdx' }
      file_path { Rails.root.join('spec/fixtures/spectra_file.jdx') }
      aasm_state { :edited }
    end

    trait :with_spectra_file_failure do
      filename { 'spectra_file.jdx' }
      file_path { Rails.root.join('spec/fixtures/spectra_file.jdx') }
      aasm_state { :failure }
    end

    trait :with_json_file do
      filename { 'upload.json' }
      file_path { Rails.root.join('spec/fixtures/upload.json') }
    end

    trait :with_infer_json_file do
      filename { 'infer.json' }
      file_path { Rails.root.join('spec/fixtures/infer.json') }
    end

    trait :with_csv_file do
      filename { 'upload.csv' }
      file_path { Rails.root.join('spec/fixtures/upload.csv') }
    end

    trait :with_nmrium_file do
      filename { 'upload.nmrium' }
      file_path { Rails.root.join('spec/fixtures/upload.nmrium') }
    end

    trait :with_tif_file do
      filename { 'upload.tif' }
      file_path { Rails.root.join('spec/fixtures/upload.tif') }
    end

    trait :with_annotation do
      filename { 'upload.jpg' }
      file_path { Rails.root.join('spec/fixtures/upload.jpg') }

      after(:create) do |attachment|
        attachment.attachment_data['derivatives']['annotation']['annotated_file_location'] = attachment.attachment.id

        attachment.update_columns(attachment_data: attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
      end
    end

    trait :attached_to_container do
      association :attachable, factory: :container
    end

    trait :attached_to_research_plan do
      association :attachable, factory: :research_plan
    end

    trait :with_sample_collection_zip do
      file_path { Rails.root.join('spec/fixtures/import/collection_samples.zip') }
    end

    trait :with_reaction_collection_zip do
      file_path { Rails.root.join('spec/fixtures/import/collection_reaction.zip') }
    end

    trait :with_wellplate_collection_zip do
      file_path { Rails.root.join('spec/fixtures/import/collection_wellplate.zip') }
    end

    trait :with_screen_collection_zip do
      file_path { Rails.root.join('spec/fixtures/import/collection_screen.zip') }
    end

    trait :with_researchplan_collection_zip do
      file_path { Rails.root.join('spec/fixtures/import/20230113_research_plan_one_attachment.zip') }
    end
  end
end
