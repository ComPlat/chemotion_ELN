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
  end
end
