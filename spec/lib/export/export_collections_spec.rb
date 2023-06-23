# frozen_string_literal: true

# rubocop:disable RSpec/MultipleMemoizedHelpers
require 'rails_helper'

# test for ExportJson ImportJson
RSpec.describe 'ExportCollection' do
  let(:user) { create(:person, first_name: 'Ulf', last_name: 'User', name_abbreviation: 'UU') }
  let(:file_names) do
    file_names = []
    Zip::File.open(file_path) do |files|
      files.each do |file|
        file_names << file.name
      end
    end
    file_names
  end

  let(:collection) { create(:collection, user_id: user.id, label: 'Awesome Collection') }
  let(:file_path) { File.join('public', 'zip', "#{job_id}.zip") }

  let(:molfile) { Rails.root.join('spec/fixtures/test_2.mol').read }
  let(:svg) { Rails.root.join('spec/fixtures/images/molecule.svg').read }
  let(:sample) do
    create(:sample, created_by: user.id, name: 'Sample zero', molfile: molfile, collections: [collection])
  end
  let(:molecule_name_name) { 'Awesome Molecule' }
  let(:molecule_name) do
    create(:molecule_name, user_id: user.id, name: molecule_name_name, molecule_id: sample.molecule_id)
  end
  let(:job_id) { SecureRandom.uuid }
  let(:molecule_file) { "images/molecules/#{sample.molecule.molecule_svg_file}" }

  context 'with a sample' do
    before do
      sample
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', true)
      export.prepare_data
      export.to_file
    end

    it 'exported file exists' do
      file_path = File.join('public', 'zip', "#{job_id}.zip")
      expect(File.exist?(file_path)).to be true
    end

    it 'zip file containing export.json, schema.json and description.txt and molecule image' do
      expect(file_names.length).to be 4
      expect(file_names).to include('export.json', 'schema.json', 'description.txt', molecule_file)
    end
  end

  context 'with a researchplan' do # rubocop:disable RSpec/MultipleMemoizedHelpers
    let(:collection) { create(:collection, user_id: user.id, label: 'collection-with-rp') }
    let(:research_plan) { create(:research_plan, collections: [collection]) }
    let(:expected_attachment_filename) { "attachments/#{attachment.identifier}.png" }
    let(:attachment) do
      create(:attachment, :with_png_image, bucket: 1, created_by: 1, attachable_id: research_plan.id)
    end

    before do
      research_plan.attachments = [attachment]
      research_plan.save!
      update_body_of_researchplan(research_plan, attachment.identifier)

      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', true)
      export.prepare_data
      export.to_file
    end

    it 'exported file exists' do
      expect(File.exist?(file_path)).to be true
    end

    it 'attachment is in zip file' do
      expect(file_names.length).to be 4
      expect(file_names).to include expected_attachment_filename
    end
  end

  context 'with a cell line including an analysis with a png' do
    before do
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', true)
      export.prepare_data
      export.to_file
    end

    let(:cell_line_sample) { create(:cellline_sample, user_id: user.id, collections: [collection]) }

    it 'zip file was created' do
      expect(File.exist?(file_path)).to be true
    end

    it 'zip file include the cell line and its analysis attachments' do
      expect(file_names.length).to be 4
    end

    it 'cell line properties in zip file match the original ones' do
      pending
    end
  end

  def update_body_of_researchplan(research_plan, identifier_of_attachment)
    research_plan.body = [
      {
        id: 'entry-003',
        type: 'image',
        value: {
          file_name: 'xyz.png',
          public_name: identifier_of_attachment,
        },
      },
    ]
    research_plan.save!
    research_plan
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers
