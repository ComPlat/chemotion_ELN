# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'ImportCollection' do
  let(:user) do
    create(:person, first_name: 'Ulf', last_name: 'User', name_abbreviation: 'UU')
  end

  before do
    copy_target_to_import_folder(import_id)
    stub_rest_request('OKKJLVBELUTLKV-UHFFFAOYSA-N')
    stub_rest_request('XBDQKXXYIPTUBI-UHFFFAOYSA-N')
    stub_rest_request('XLYOFNOQVPJJNP-UHFFFAOYSA-N')
    stub_rest_request('UHOVQNZJYSORNB-UHFFFAOYSA-N')
    stub_rest_request('RJUFJBKOKNCXHH-UHFFFAOYSA-N')

    stub_const('EPSILON', 0.001)
  end

  describe '.execute' do
    let(:target_location) { File.join('tmp', 'import', "#{import_id}.zip") }

    let(:importer) { Import::ImportCollections.new(attachment, user.id) }

    describe 'import a collection with samples' do
      let(:import_id) { 'collection_samples' }
      let(:attachment) { create(:attachment, :with_sample_collection_zip) }

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
        expect(reaction.dangerous_products).to match_array([])
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
        expect(research_plan.created_at.strftime('%FT%T')).to eq('2022-08-24T14:19:19')
        expect(research_plan.updated_at.strftime('%FT%T')).to eq('2022-08-24T14:19:19')
        expect(research_plan.attachments.length).to eq(1)
        attachment = research_plan.attachments[0]
        research_plan.body
        expect(attachment.identifier).to eq(expected_identifier)
        expect(attachment.attachment_data).not_to be_nil
      end
    end
  end

  def stub_rest_request(identifier)
    stub_request(:get, "http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/#{identifier}/record/JSON")
      .with(
        headers: {
          'Accept' => '*/*',
          'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
          'Content-Type' => 'text/json',
          'User-Agent' => 'Ruby',
        },
      )
      .to_return(status: 200, body: '', headers: {})
  end

  def copy_target_to_import_folder(import_id)
    src_location = File.join('spec', 'fixtures', 'import', "#{import_id}.zip")
    FileUtils.mkdir_p(File.join('tmp', 'import'))
    target_location = File.join('tmp', 'import', "#{import_id}.zip")
    FileUtils.copy_file(src_location, target_location)
  end
end
