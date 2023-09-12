# frozen_string_literal: true

require 'rails_helper'

# test for ExportCollection
RSpec.describe 'ExportCollection' do
  let(:user) { create(:person, first_name: 'Ulf', last_name: 'User', name_abbreviation: 'UU') }
  let(:nested) { true }
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
  let(:sample) { build(:sample, created_by: user.id, name: 'Sample zero', molfile: molfile, collections: [collection]) }
  let(:molecule_name_name) { 'Awesome Molecule' }
  let(:molecule_name) do
    build(:molecule_name, user_id: user.id, name: molecule_name_name, molecule_id: sample.molecule_id)
  end
  let(:job_id) { SecureRandom.uuid }

  let(:elements_in_json) do
    json = {}
    Zip::File.open(file_path) do |files|
      files.each do |file|
        json = JSON.parse(file.get_input_stream.read) if file.name == 'export.json'
      end
    end
    json
  end

  context 'with a sample' do
    before do
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', true)
      export.prepare_data
      export.to_file
    end

    it 'exported file exists' do
      file_path = File.join('public', 'zip', "#{job_id}.zip")
      expect(File.exist?(file_path)).to be true
    end

    it 'zip file containing export.json, schema.json and description.txt' do
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

  context 'with 2 vessels' do
    let(:vessel_template_join) { 'VesselTemplateVessel' }
    let(:vessel_collection_join) { 'CollectionsVessel' }
    let(:vessel) { create(:vessel, user_id: user.id, collections: [collection]) }
    let!(:vessel2) do
      create(:vessel, vessel_template: vessel.vessel_template, user_id: user.id, collections: [collection])
    end
    let(:first_vessel_in_json) { vessels[vessels.keys.first] }
    let(:second_vessel_in_json) { vessels[vessels.keys.second] }
    let(:vessels) { elements_in_json["Vessel"] }

    before do
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', nested)
      export.prepare_data
      export.to_file
    end

    it 'zip file was created' do
      expect(File.exist?(file_path)).to be true
    end

    it 'zip file includes the vessels' do
      expect(file_names.length).to be 3
      expect(file_names).to include('export.json', 'schema.json', 'description.txt')
    end

    it 'vessel properties in zip file match the original ones' do
      expect(vessel.as_json).to eq first_vessel_in_json
      expect(vessel2.as_json).to eq second_vessel_in_json
    end

    it 'linking between the collection and the first vessel is given' do
      collection_uuid = elements_in_json["Collection"].keys.first
      vessel_uuid = elements_in_json["Vessel"].keys.first
      expect(elements_in_json[vessel_collection_join].values.first['collection_id']).to eq collection_uuid
      expect(elements_in_json[vessel_collection_join].values.first['vessel_id']).to eq vessel_uuid
    end

    it 'linking between the collection and the second sample is given' do
      collection_uuid = elements_in_json["Collection"].keys.first
      vessel2_uuid = elements_in_json["Vessel"].keys.second
      expect(elements_in_json[vessel_collection_join].values.second['collection_id']).to eq collection_uuid
      expect(elements_in_json[vessel_collection_join].values.second['vessel_id']).to eq vessel2_uuid
    end

    it 'linking between the template and the first sample is given' do
      template_uuid = elements_in_json["VesselTemplate"].keys.first
      vessel_uuid = elements_in_json["Vessel"].keys.first
      expect(elements_in_json[vessel_template_join].values.first['vessel_template_id']).to eq template_uuid
      expect(elements_in_json[vessel_template_join].values.first['vessel_id']).to eq vessel_uuid
    end

    it 'linking between the template and the second sample is given' do
      template_uuid = elements_in_json['VesselTemplate'].keys.first
      vessel2_uuid = elements_in_json['Vessel'].keys.second
      expect(elements_in_json[vessel_template_join].values.second['vessel_template_id']).to eq template_uuid
      expect(elements_in_json[vessel_template_join].values.second['vessel_id']).to eq vessel2_uuid
    end
  end

  context 'with a researchplan' do
    let(:collection) { create(:collection, user_id: user.id, label: 'collection-with-rp') }
    let(:research_plan) { create(:research_plan, collections: [collection]) }

    let(:attachment) do
      create(:attachment, :with_png_image,
             bucket: 1,
             created_by: 1,
             attachable_id: research_plan.id)
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
      file_path = File.join('public', 'zip', "#{job_id}.zip")
      expect(File.exist?(file_path)).to be true
    end

    it 'attachment is in zip file' do
      file_names = []
      file_path = File.join('public', 'zip', "#{job_id}.zip")
      Zip::File.open(file_path) do |files|
        files.each do |file|
          file_names << file.name
        end
      end
    end
  end

  def update_body_of_researchplan(research_plan, identifier_of_attachment) # rubocop:disable Metrics/MethodLength
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
