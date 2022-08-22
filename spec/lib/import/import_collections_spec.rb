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
    stub_const('EPSILON', 0.001)

    stub_request(:get, 'http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/RJUFJBKOKNCXHH-UHFFFAOYSA-N/record/JSON')
      .with(
        headers: {
          'Accept' => '*/*',
          'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
          'Content-Type' => 'text/json',
          'User-Agent' => 'Ruby'
        }
      )
      .to_return(status: 200, body: '', headers: {})

 stub_request(:get, "http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/XBDQKXXYIPTUBI-UHFFFAOYSA-N/record/JSON").
         with(
           headers: {
          'Accept'=>'*/*',
          'Accept-Encoding'=>'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
          'Content-Type'=>'text/json',
          'User-Agent'=>'Ruby'
           }).
         to_return(status: 200, body: "", headers: {})

    stub_request(:get, 'http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/OKKJLVBELUTLKV-UHFFFAOYSA-N/record/JSON')
      .with(
        headers: {
          'Accept' => '*/*',
          'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
          'Content-Type' => 'text/json',
          'User-Agent' => 'Ruby'
        }
      )
      .to_return(status: 200, body: '', headers: {})
  end

  context 'when importing from a file' do
    it 'import a collection with 2 samples' do
      zip_file_path = copy_target_to_import_folder('collection_samples')
      do_import(zip_file_path, user)

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
      expect(sample.is_top_secret).to eq(false)
      expect(sample.external_label).to eq('Ext-Water')
      expect(sample.short_label).to eq('FM-7')
      expect(sample.real_amount_unit).to eq('g')
      expect(sample.density).to be_within(EPSILON).of(0.998202)
      expect(sample.melting_point.to_s).to eq('0.0...Infinity')
      expect(sample.boiling_point.to_s).to eq('100.0...Infinity')
      expect(sample.molarity_value).to be_within(EPSILON).of(0)
      expect(sample.molarity_unit).to eq('M')
      expect(sample.decoupled).to eq(false)
      expect(sample.molecular_mass).to be_within(EPSILON).of(0)
      expect(sample.sum_formula).to eq('')

      # TO DO: found out whats the meaning of these params
      expect(sample.real_amount_value).to eq(nil)
      expect(sample.user_id).to eq(nil)

      sample = Sample.find_by(name: 'Benzene A')
      expect(sample).to be_present
    end

    it 'import a collection with a reaction' do
      zip_file_path = copy_target_to_import_folder('collection_reaction')
      do_import(zip_file_path, user)

      collection = Collection.find_by(label: 'Fab-Col-Reaction')
      expect(collection).to be_present

      reaction = Reaction.first
      expect(reaction).to be_present
    end
  end

  def create_tmp_file
    import_path = File.join('tmp', 'import')
    FileUtils.mkdir_p(import_path) unless Dir.exist?(import_path)
  end

  def copy_target_to_import_folder(import_id)
    src_location = File.join('spec', 'fixtures', 'import', "#{import_id}.zip")
    target_location = File.join('tmp', 'import', "#{import_id}.zip")
    FileUtils.copy_file(src_location, target_location)
    target_location
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
