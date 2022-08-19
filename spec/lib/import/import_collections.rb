# frozen_string_literal: true

require 'rails_helper'

# test for ExportJson ImportJson
RSpec.describe 'ImportCollection' do
  let(:user) do
    create(:person, first_name: 'Ulf', last_name: 'User', name_abbreviation: 'UU')
  end

  before do
    user.save!
    create_tmp_file
  end

  context 'imports from a file' do
    it 'import a collection with a sample' do
      zip_file_path = copy_target_to_import_folder('fe7fc72d-f6ec-467d-ae23-6587e5fd4333')
      do_import(zip_file_path, user)

      collection = Collection.find_by(label: 'Fab-Col-Sample')
      expect(collection).to be_present
      sample = Sample.find_by(name: 'Benzene A')
      expect(sample).to be_present
    end
  end

  def create_tmp_file
    import_path = File.join('tmp', 'import')
    FileUtils.mkdir_p(import_path) unless Dir.exist?(import_path)
  end

  def copy_target_to_import_folder(import_id)
    import_file_path = File.join('spec', 'fixtures', 'import', "#{import_id}.zip")
    zip_file_path = File.join('tmp', 'import', "#{import_id}.zip")
    FileUtils.copy_file(zip_file_path, import_file_path)
    zip_file_path
  end

  def do_import(zip_file_path, user)
    import = Import::ImportCollections.new(AttachmentMock.new(zip_file_path), user.id)
    import.extract
    import.import
    import.cleanup
  end

  class AttachmentMock
    def initialize(file_path)
      @file_path = file_path
    end

    def read_file
      File.open(@file_path).read
    end
  end
end
