# frozen_string_literal: true

# rubocop:disable RSpec/MultipleMemoizedHelpers, RSpec/IndexedLet, Lint/MissingCopEnableDirective, Lint/RedundantCopDisableDirective
require 'rails_helper'

# test for ExportCollection
RSpec.describe 'ExportCollection' do
  let(:nested) { true }
  let(:gate) { false }
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

  let(:molfile) { build(:molfile, type: 'test_2') }
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
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', nested, gate)
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

    context 'with multiple image fields' do
      let(:attachment1) do
        create(:attachment, :with_png_image,
               identifier: '3367b5a0-24e9-11f0-ac68-bde43cb79548',
               filename: 'Screenshot from 2025-04-29 12-01-22.png',
               created_by: user.id)
      end
      let(:attachment2) do
        create(:attachment, :with_png_image,
               identifier: '3d3f3da0-24e9-11f0-ac68-bde43cb79548',
               filename: 'Screenshot from 2025-04-23 10-59-42.png',
               created_by: user.id)
      end
      let(:expected_attachment_filenames) do
        %W[attachments/#{attachment1.identifier}.png attachments/#{attachment2.identifier}.png]
      end

      before do
        research_plan.attachments = [attachment1, attachment2]
        research_plan.save!

        research_plan.update(
          body: [
            {
              id: 'a39d554e-6822-43e6-9fb5-7a1ce7cc0267',
              type: 'image',
              value: {
                file_name: 'Screenshot from 2025-04-29 12-01-22.png',
                public_name: '3367b5a0-24e9-11f0-ac68-bde43cb79548',
              },
            },
            {
              id: 'ab9740db-11b0-4b26-8c1d-58db11c58a32',
              type: 'image',
              value: {
                file_name: 'Screenshot from 2025-04-23 10-59-42.png',
                public_name: '3d3f3da0-24e9-11f0-ac68-bde43cb79548',
              },
            },
          ],
        )

        export = Export::ExportCollections.new(job_id, [collection.id], 'zip', nested, gate)
        export.prepare_data
        export.to_file
      end

      it 'exports both attachments' do
        expect(file_names).to include(*expected_attachment_filenames)
      end

      it 'has correct number of files in zip' do
        # 3 base files (export.json, schema.json, description.txt) + 2 attachments
        expect(file_names.length).to be 5
      end
    end
  end

  context 'with a reaction' do # rubocop:disable RSpec/MultipleMemoizedHelpers
    let(:sample1) { create(:sample) }
    let(:sample2) { create(:sample) }
    let(:reaction_in_json) { elements_in_json['Reaction'].first.second }

    let(:reaction) do
      create(:reaction, collections: [collection],
                        starting_materials: [sample1],
                        products: [sample2])
    end

    before do
      reaction
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', false)
      export.prepare_data
      export.to_file
    end

    it 'exported file exists and has 4 entries' do
      expect(File.exist?(file_path)).to be true
      expect(file_names.length).to be 4
    end

    it 'export.json has one reaction entry' do
      expect(elements_in_json['Reaction'].length).to be 1
      # TO DO - find an elegant way to check all properties json <-> reaction, maybe with an grape entity??
      expect(reaction_in_json['name']).to eq reaction.name
    end
  end

  context 'with two cell lines including one has a jpg attachment in analysis' do
    let(:sample_material_join) { 'CelllineMaterialCelllineSample' }
    let(:sample_collection_join) { 'CollectionsCelllineSample' }
    let(:expected_attachment_name) do
      "attachments/#{cell_line_sample.container.children[0].children[0].children[0].attachments[0].identifier}.jpg"
    end
    let(:cell_line_sample) { create(:cellline_sample, :with_analysis, user_id: user.id, collections: [collection]) }
    let!(:cell_line_sample2) do
      create(:cellline_sample,
             cellline_material: cell_line_sample.cellline_material,
             user_id: user.id,
             collections: [collection])
    end

    let(:fist_cellline_in_json) { cell_line_samples[cell_line_samples.keys.first] }
    let(:second_cellline_in_json) { cell_line_samples[cell_line_samples.keys.second] }
    let(:cell_line_samples) { elements_in_json['CelllineSample'] }

    before do
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', nested, gate)
      export.prepare_data
      export.to_file
    end

    it 'zip file was created' do
      expect(File.exist?(file_path)).to be true
    end

    it 'zip file include the cell line and its analysis attachments' do
      expect(file_names.length).to be 4
      expect(file_names).to include('export.json', 'schema.json', 'description.txt', expected_attachment_name)
    end

    it 'cell line properties in zip file match the original ones' do
      expect(cell_line_sample.as_json).to eq fist_cellline_in_json
      expect(cell_line_sample2.as_json).to eq second_cellline_in_json
    end

    it 'linking between the collection and the first sample is given' do
      collection_uuid = elements_in_json['Collection'].keys.first
      sample1_uuid = elements_in_json['CelllineSample'].keys.first
      expect(elements_in_json[sample_collection_join].values.first['collection_id']).to eq collection_uuid
      expect(elements_in_json[sample_collection_join].values.first['cellline_sample_id']).to eq sample1_uuid
    end

    it 'linking between the collection and the second sample is given' do
      collection_uuid = elements_in_json['Collection'].keys.first
      sample2_uuid = elements_in_json['CelllineSample'].keys.second
      expect(elements_in_json[sample_collection_join].values.second['collection_id']).to eq collection_uuid
      expect(elements_in_json[sample_collection_join].values.second['cellline_sample_id']).to eq sample2_uuid
    end

    it 'linking between the material and the first sample is given' do
      material_uuid = elements_in_json['CelllineMaterial'].keys.first
      sample1_uuid = elements_in_json['CelllineSample'].keys.first
      expect(elements_in_json[sample_material_join].values.first['cellline_material_id']).to eq material_uuid
      expect(elements_in_json[sample_material_join].values.first['cellline_sample_id']).to eq sample1_uuid
    end

    it 'linking between the material and the second sample is given' do
      material_uuid = elements_in_json['CelllineMaterial'].keys.first
      sample2_uuid = elements_in_json['CelllineSample'].keys.second
      expect(elements_in_json[sample_material_join].values.second['cellline_material_id']).to eq material_uuid
      expect(elements_in_json[sample_material_join].values.second['cellline_sample_id']).to eq sample2_uuid
    end
  end

  context 'with a chemical' do
    let(:chemical) { create(:chemical, sample_id: sample.id) }

    before do
      sample.save!
      chemical.save!
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', true)
      export.prepare_data
      export.to_file
    end

    it 'exported file exists' do
      file_path = File.join('public', 'zip', "#{job_id}.zip")
      expect(File.exist?(file_path)).to be true
    end

    it 'Chemical key is present in export.json' do
      file_path = File.join('public', 'zip', "#{job_id}.zip")
      export_json_content = Zip::File.open(file_path) do |files|
        json_file = files.detect { |file| file.name == 'export.json' }
        JSON.parse(json_file.get_input_stream.read)
      end
      expect(export_json_content).to have_key('Chemical')
    end
  end

  context 'with sample components' do
    let(:component) { create(:component, sample_id: sample.id) }

    before do
      sample.sample_type = Sample::SAMPLE_TYPE_MIXTURE
      sample.save!
      component.save!
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', true)
      export.prepare_data
      export.to_file
    end

    it 'exported file exists' do
      file_path = File.join('public', 'zip', "#{job_id}.zip")
      expect(File.exist?(file_path)).to be true
    end

    it 'Component key is present in export.json' do
      file_path = File.join('public', 'zip', "#{job_id}.zip")
      export_json_content = Zip::File.open(file_path) do |files|
        json_file = files.detect { |file| file.name == 'export.json' }
        JSON.parse(json_file.get_input_stream.read)
      end
      expect(export_json_content).to have_key('Component')
    end
  end

  context 'when sbmm samples, sbmms, analyses and attachments were exported to zip file' do
    let(:collection) { create(:collection, user_id: user.id, label: 'sbmm test') }
    let(:sbmm_sample1) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(:uniprot_sbmm, systematic_name: 'Zoological Phenomenon Protein'),
        user: user,
        container: FactoryBot.create(:container, :with_analysis),
      )
    end
    let(:sbmm_sample2) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(
          :modified_uniprot_sbmm,
          systematic_name: 'Foobar',
          parent: sbmm_sample1.sequence_based_macromolecule,
        ),
        user: user,
      )
    end
    let(:attachment1) do
      create(
        :attachment, :with_cif_file, bucket: 1, created_by: user.id,
                                     attachable_id: sbmm_sample1.sequence_based_macromolecule.id
      )
    end
    let(:attachment2) do
      create(
        :attachment, :with_png_image, bucket: 1, created_by: user.id, attachable_id: sbmm_sample1.id
      )
    end
    let(:expected_attachment_filenames) do
      %W[attachments/#{attachment1.identifier}.cif attachments/#{attachment2.identifier}.png]
    end

    let(:sequence_based_macromolecule_samples) { elements_in_json['SequenceBasedMacromoleculeSample'] }
    let(:sequence_based_macromolecules) { elements_in_json['SequenceBasedMacromolecule'] }
    let(:protein_sequence_modifications) { elements_in_json['ProteinSequenceModification'] }
    let(:post_translational_modifications) { elements_in_json['PostTranslationalModification'] }
    let(:attachments) { elements_in_json['Attachment'] }
    let(:container) { elements_in_json['Container'] }

    before do
      sbmm_sample1
      sbmm_sample1.attachments = [attachment2]
      sbmm_sample1.sequence_based_macromolecule.attachments = [attachment1]
      sbmm_sample1.save!
      sbmm_sample2

      CollectionsSequenceBasedMacromoleculeSample.create!(sequence_based_macromolecule_sample: sbmm_sample1,
                                                          collection: collection)
      CollectionsSequenceBasedMacromoleculeSample.create!(sequence_based_macromolecule_sample: sbmm_sample2,
                                                          collection: collection)

      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', nested, gate)
      export.prepare_data
      export.to_file
    end

    it 'returns existing zip file' do
      file_path = File.join('public', 'zip', "#{job_id}.zip")
      expect(File.exist?(file_path)).to be_present
    end

    it 'has included files' do
      expect(file_names.length).to be 5
      expect(file_names).to include('export.json', 'schema.json', 'description.txt')
      expect(file_names).to include(*expected_attachment_filenames)
    end

    it 'has sbmm samples in export.js' do
      expect(sequence_based_macromolecule_samples.length).to be 2
    end

    it 'has sbmms with post translational and protein sequence modifications in export.js' do
      expect(sequence_based_macromolecules.length).to be 2
      expect(protein_sequence_modifications.length).to be 1
      expect(post_translational_modifications.length).to be 1
    end

    it 'has analyses and attachments in export.js' do
      expect(attachments.length).to be 2
      expect(container.length).to be 3
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
# rubocop:enable RSpec/MultipleMemoizedHelpers, RSpec/IndexedLet, Lint/MissingCopEnableDirective, Lint/RedundantCopDisableDirective
