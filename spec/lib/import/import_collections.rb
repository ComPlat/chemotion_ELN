# frozen_string_literal: true

require 'rails_helper'

# test for ExportJson ImportJson
RSpec.describe 'ExportImportCollection' do
  let(:user) do
    create(:person, first_name: 'Ulf', last_name: 'User', name_abbreviation: 'UU')
  end

  before do
    user.save!
  end

  context 'imports from a file' do
    before do
      # create the `tmp/imports/` if it does not exist yet
      import_path = File.join('tmp', 'import')
      FileUtils.mkdir_p(import_path) unless Dir.exist?(import_path)

      # store the file as `tmp/imports/<import_id>.zip`
      import_id = '2541a423-11d9-4c76-a7e1-0da470644012'
      import_file_path = File.join('spec', 'fixtures', 'import', "#{import_id}.zip")
      zip_file_path = File.join('tmp', 'import', "#{import_id}.zip")
      File.open(zip_file_path, 'wb') do |file|
        file.write(File.open(import_file_path).read)
      end

      import = Import::ImportCollections.new(import_id, user.id)
      import.extract
      import.read
      import.import
      import.cleanup
    end

    it 'creates a collection' do
      collection = Collection.find_by(label: 'Awesome Collection')
      expect(collection).to be_present
    end
  end
end
