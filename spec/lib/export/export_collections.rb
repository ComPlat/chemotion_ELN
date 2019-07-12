# frozen_string_literal: true
require 'rails_helper'

# test for ExportJson ImportJson
RSpec.describe 'ExportImportCollection' do
  let(:user) {
    create(:person, first_name: 'Ulf', last_name: 'User', name_abbreviation: 'UU')
  }
  let(:collection) {
    create(:collection, user_id: user.id, label: 'Awesome Collection')
  }
  let(:molfile){
    IO.read(Rails.root.join("spec", "fixtures", "test_2.mol"))
  }
  let(:svg) {
    IO.read(Rails.root.join("spec", "fixtures", "images", "molecule.svg"))
  }
  let(:sample) {
    build(
      :sample, created_by: user.id, name: 'Sample zero', molfile: molfile,
      collections: [collection]
    )
  }
  let(:molecule_name_name) { 'Awesome Molecule' }
  let(:molecule_name) {
    build(
      :molecule_name, user_id: user.id, name: molecule_name_name, molecule_id: sample.molecule_id
    )
  }
  let(:job_id) {
    SecureRandom.uuid
  }
  before do
    user.save!
    collection.save!
    sample.save!
    molecule_name.save!
    sample.update!(molecule_name_id: molecule_name.id)
  end

  context 'creates an export file, ' do
    before do
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', true)
      export.prepare_data
      export.to_file
    end

    it 'which exists' do
      file_path = File.join('public', 'zip', "#{job_id}.zip")
      expect(File.exist?(file_path)).to be true
    end

    it 'which is a zip file containing export.json, schema.json and description.txt' do
      file_names = []
      file_path = File.join('public', 'zip', "#{job_id}.zip")
      Zip::File.open(file_path) do |files|
        files.each do |file|
          file_names << file.name
        end
      end
      expect(file_names).to include('export.json', 'schema.json', 'description.txt')
    end
  end
end
