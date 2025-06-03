# frozen_string_literal: true

# rubocop:disable RSpec/LetSetup

require 'rails_helper'

RSpec.describe 'ImportCollection' do
  let(:user) do
    create(:person, first_name: 'Ulf', last_name: 'User', name_abbreviation: 'UU')
  end

  before do
    copy_target_to_import_folder(import_id)
    stub_const('EPSILON', 0.001)
  end

  describe '.execute' do
    let(:target_location) { File.join('tmp', 'import', "#{import_id}.zip") }

    let(:importer) { Import::ImportCollections.new(attachment, user.id) }

    describe 'import a collection with samples, with directories in the zip structure and missing schema.json' do
      let(:import_id) { 'collection_samples' }
      # let(:attachment) { create(:attachment, :with_sample_collection_zip) }
      let(:attachment) { create(:attachment, :with_edited_collection_zip) }

      it 'successfully import 2 samples' do # rubocop:disable RSpec/MultipleExpectations
        importer.execute

        collection = Collection.find_by(label: 'Fab-Col-Sample')
        expect(collection).to be_present

        sample = Sample.find_by(name: 'Water-001')

        expect(sample).to be_present
        expect(sample.target_amount_value).to be_within(EPSILON).of(0.1)
        expect(sample.target_amount_unit).to eq('g')
        expect(sample.created_at.strftime('%FT%T')).to eq('2022-08-22T07:59:32')
        expect(sample.updated_at.strftime('%FT%T')).to eq('2022-08-22T07:59:32')
        expect(sample.description).to eq('MyWater')
        expect(sample.purity).to be_within(EPSILON).of(0.95)
        expect(sample.location).to eq('Room X1')
        expect(sample.is_top_secret).to be(false)
        expect(sample.external_label).to eq('Ext-Water')
        expect(sample.short_label).to eq('FM-7')
        expect(sample.real_amount_unit).to eq('g')
        expect(sample.density).to be_within(EPSILON).of(0.998202)
        expect(sample.melting_point.to_s).to eq('0.0...Infinity')
        expect(sample.boiling_point.to_s).to eq('100.0...Infinity')
        expect(sample.molarity_value).to be_within(EPSILON).of(0)
        expect(sample.molarity_unit).to eq('M')
        expect(sample.decoupled).to be(false)
        expect(sample.molecular_mass).to be_within(EPSILON).of(0)
        expect(sample.sum_formula).to eq('')

        expect(sample.real_amount_value).to be_nil
        expect(sample.user_id).to be_nil

        sample = Sample.find_by(name: 'Benzene A')
        expect(sample).to be_present
      end
    end

    describe 'import a collection with a reaction' do
      let(:import_id) { 'collection_reaction' }
      let(:attachment) { create(:attachment, :with_reaction_collection_zip) }

      it 'successfully import 1 reaction' do # rubocop:disable RSpec/MultipleExpectations
        importer.execute

        collection = Collection.find_by(label: 'Fab-Col-Reaction')
        expect(collection).to be_present

        reaction = Reaction.first
        expect(reaction).to be_present
        expect(reaction.name).to eq('Esterification of propionic acid ')
        expect(reaction.created_at.strftime('%FT%T')).to eq('2022-08-22T14:19:45')
        expect(reaction.description.to_s).to eq('{"ops"=>[{"insert"=>"A "}, {"attributes"=>{"bold"=>true}, "insert"=>"sample "}, {"attributes"=>{"underline"=>true}, "insert"=>"reaction"}, {"insert"=>"\\n"}]}') # rubocop:disable Layout/LineLength
        expect(reaction.timestamp_start).to eq('22/08/2022 16:16:30')
        expect(reaction.timestamp_stop).to eq('23/08/2022 16:16:33')
        expect(reaction.observation.to_s).to eq('{"ops"=>[{"insert"=>"\\nThe obtained crude product was purified via HPLC using MeCN/H₂O 10:1."}]}') # rubocop:disable Layout/LineLength
        expect(reaction.purification).to match_array(%w[TLC HPLC])
        expect(reaction.dangerous_products).to be_empty
        expect(reaction.tlc_solvents).to eq('')
        expect(reaction.tlc_description).to eq('')
        expect(reaction.rf_value).to eq('0')
        expect(reaction.temperature.to_s).to eq('{"data"=>[], "userText"=>"30", "valueUnit"=>"°C"}')
        expect(reaction.status).to eq('Done')
        expect(reaction.solvent).to eq('')
        expect(reaction.short_label).to eq('UU-R1')
        expect(reaction.role).to eq('gp')
        expect(reaction.duration).to eq('1 Day(s)')
        expect(reaction.conditions).to eq('')
      end
    end

    describe 'import a collection with a wellplate' do
      let(:import_id) { 'collection_wellplate' }
      let(:attachment) { create(:attachment, :with_wellplate_collection_zip) }

      it 'successfully imported 1 wellplate' do # rubocop:disable RSpec/MultipleExpectations
        importer.execute

        collection = Collection.find_by(label: 'Fab-Col-Wellplate')
        expect(collection).to be_present

        wellplate = Wellplate.first
        expect(wellplate).to be_present
        expect(wellplate.name).to eq('MyWellplate')
        expect(wellplate.size).to eq(96)
        expect(wellplate.description).to eq({ 'ops' => [{ 'insert' => "I made a wellplate\n" }] })

        expect(wellplate.samples).to be_present
        expect(wellplate.samples.length).to eq(1)

        expect(wellplate.wells).to be_present
        expect(wellplate.wells.length).to eq(wellplate.size)
      end
    end

    describe 'import a collection with a screen' do
      let(:import_id) { 'collection_screen' }
      let(:attachment) { create(:attachment, :with_screen_collection_zip) }

      it 'successfully imported 1 screen' do # rubocop:disable RSpec/MultipleExpectations
        importer.execute

        collection = Collection.find_by(label: 'Fab-Col-Screen')
        expect(collection).to be_present

        expect(collection.screens).to be_present
        expect(collection.screens.length).to eq(1)
        screen = collection.screens[0]
        expect(screen.description.to_s).to eq('{"ops"=>[{"insert"=>"nothing to see here\\n"}]}')
        expect(screen.name).to eq('MyScreen')
        expect(screen.result).to eq('also nothing')
        expect(screen.collaborator).to eq('none')
        expect(screen.conditions).to eq('also none')
        expect(screen.requirements).to eq('nothing')
        expect(screen.created_at.strftime('%FT%T')).to eq('2022-08-24T08:39:17')
        expect(screen.updated_at.strftime('%FT%T')).to eq('2022-08-24T08:39:17')

        expect(screen.wellplates.length).to eq(1)
      end
    end

    describe 'import a collection with a researchplan' do
      let(:import_id) { 'collection_research_plan' }
      let(:attachment) { create(:attachment, :with_researchplan_collection_zip) }

      it 'successfully imported 1 researchplan' do # rubocop:disable RSpec/MultipleExpectations
        importer.execute

        collection = Collection.find_by(label: 'collection-with-rp')
        expect(collection).to be_present
        expect(collection.research_plans).to be_present
        expect(collection.research_plans.length).to eq(1)
        research_plan = collection.research_plans[0]
        expected_identifier = research_plan.body.first['value']['public_name']

        expect(research_plan.name).to eq('Research plan 1')
        expect(research_plan.created_at.strftime('%FT%T')).to eq('2023-01-13T09:47:24')
        expect(research_plan.updated_at.strftime('%FT%T')).to eq('2023-01-13T09:47:34')
        expect(research_plan.attachments.length).to eq(1)
        attachment = research_plan.attachments[0]
        research_plan.body
        expect(attachment.identifier).to eq(expected_identifier)
        expect(attachment.attachment_data).not_to be_nil
      end
    end

    describe 'import a collection with a chemical' do
      let(:import_id) { 'collection_chemicals' }
      let(:attachment) { create(:attachment, :with_chemicals_collection_zip) }

      it 'successfully imported 1 chemical' do
        importer.execute

        collection = Collection.find_by(label: 'collection_with_chemical')
        expect(collection).to be_present
        expect(collection.samples.map(&:chemical).length).to eq(1)
      end
    end

    describe 'import a collection with a sample with components' do
      let(:import_id) { 'collection_components' }
      let(:attachment) { create(:attachment, :with_components_collection_zip) }

      before do
        stub_request(:get, /pubchem.ncbi.nlm.nih.gov/).to_return(status: 200, body: '{}', headers: {})
      end

      it 'successfully imported components' do
        importer.execute

        collection = Collection.find_by(label: 'collection_with_components')
        expect(collection).to be_present
        expect(collection.samples.map(&:components).flatten.length).to eq(2)
      end
    end

    context 'with zip file including two cell line samples, material already existing' do
      let!(:cell_line) { create(:cellline_sample) }
      let(:import_id) { '20230629_two_cell_line_samples' }
      let(:attachment) do
        create(:attachment, file_path: Rails.root.join('spec/fixtures/import/20230629_two_cell_line_samples.zip'))
      end

      before do
        importer.execute
      end

      it 'collection was created and has two cell lines' do
        expect(Collection.find_by(label: 'Awesome Collection')).not_to be_nil
        expect(Collection.find_by(label: 'Awesome Collection').cellline_samples.length).to be 2
      end

      it 'Two cell line samples were imported, one from the original state' do
        expect(CelllineSample.count).to be 3
      end

      it 'Only one material exists' do
        expect(CelllineMaterial.count).to be 1
      end
    end

    context 'with zip file including one empty wellplate with height and width parameter' do
      let(:imported_collection) { Collection.find_by(label: 'Wellplate-Export-Example') }
      let(:import_id) { '20240129_empty_wellplate' }
      let(:attachment) do
        create(:attachment, file_path: Rails.root.join('spec/fixtures/import/20240129_empty_wellplate.zip'))
      end

      before do
        importer.execute
      end

      it 'Collection was created and contains one wellplate' do
        expect(imported_collection).not_to be_nil
        expect(imported_collection.wellplates.length).to be 1
      end

      it 'One wellplate was imported with height 8 and width 12' do
        expect(Wellplate.count).to be 1
        expect(Wellplate.first.width).to be 12
        expect(Wellplate.first.height).to be 8
      end
    end

    describe 'import a collection with 4 different sbmm samples' do
      let(:imported_collection) { Collection.find_by(label: 'sbmm test') }
      let(:sbmm_sample_with_ancestry) { SequenceBasedMacromoleculeSample.where.not(ancestry: nil) }
      let(:sbmm_sample_uniprot) { SequenceBasedMacromoleculeSample.where(name: 'uniprot') }
      let(:sbmm_with_parent) { SequenceBasedMacromolecule.where.not(parent_id: nil) }
      let(:import_id) { 'collection_sbmm_samples' }
      let(:attachment) { create(:attachment, :with_sbmm_sample_collection_zip) }

      before do
        importer.execute
      end

      it 'has created a collection with 4 sbmm samples' do
        expect(imported_collection).to be_present
        expect(imported_collection.sequence_based_macromolecule_samples.length).to be 4
      end

      it 'has successfully imported 4 sbmm samples' do
        expect(SequenceBasedMacromoleculeSample.count).to be 4
        expect(sbmm_sample_with_ancestry.count).to be 1
      end

      it 'has successfully imported 5 sbmms' do
        expect(SequenceBasedMacromolecule.count).to be 5
      end

      it 'has successfully imported 1 sbmm with parent' do
        expect(sbmm_with_parent.count).to be 1
        expect(sbmm_with_parent.first.post_translational_modification).to be_present
        expect(sbmm_with_parent.first.protein_sequence_modification).to be_present
      end

      it 'has successfully imported analyses' do
        expect(sbmm_sample_with_ancestry.first.analyses.count).to be 1
      end

      it 'has successfully imported sbmm sample and sbmm attachments' do
        expect(sbmm_sample_with_ancestry.first.attachments.count).to be 1
        expect(sbmm_sample_uniprot.first.sequence_based_macromolecule.attachments.count).to be 2
        expect(sbmm_with_parent.first.parent.attachments.count).to be 1
      end
    end
  end

  def copy_target_to_import_folder(import_id)
    src_location = File.join('spec', 'fixtures', 'import', "#{import_id}.zip")
    FileUtils.mkdir_p(File.join('tmp', 'import'))
    target_location = File.join('tmp', 'import', "#{import_id}.zip")
    FileUtils.copy_file(src_location, target_location)
  end
end
# rubocop:enable RSpec/LetSetup
