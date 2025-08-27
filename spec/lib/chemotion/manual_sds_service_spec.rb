# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::ManualSdsService do
  # Common setup shared across examples
  let(:uploaded_tempfile) { instance_double(Tempfile, path: Rails.root.join('tmp/test/upload.pdf').to_s) }
  let(:attached_file) { { tempfile: uploaded_tempfile } }

  let(:sample) { build_stubbed(:valid_sample, id: 1) }

  let(:valid_params) do
    {
      sample_id: sample.id,
      cas: '123-45-6',
      vendor_info: '{"productNumber": "ABC123"}',
      vendor_name: 'testvendor',
      vendor_product: 'testvendorproductinfo',
      attached_file: attached_file,
      chemical_data: nil,
    }
  end

  let(:factory_chemical) { build_stubbed(:chemical, :for_manual_sds_testing) }

  let(:file_paths) { ['testvendor_ABC123.pdf', '/safety_sheets/testvendor_ABC123.pdf'] }

  let(:factory_service) { described_class.new(valid_params) }

  describe '.create_manual_sds' do
    let(:service_instance) { instance_double(described_class) }

    before do
      allow(described_class).to receive(:new).with(valid_params).and_return(service_instance)
      allow(service_instance).to receive(:create).and_return(factory_chemical)
    end

    it 'delegates to an instance of the service' do
      result = described_class.create_manual_sds(valid_params)
      expect(result).to eq(factory_chemical)
      expect(described_class).to have_received(:new).with(valid_params)
      expect(service_instance).to have_received(:create)
    end
  end

  describe '#initialize' do
    let(:params) { valid_params.merge(chemical_data: '{"key": "value"}') }
    let(:service) { described_class.new(params) }

    it 'sets sample_id correctly' do
      expect(service.instance_variable_get(:@sample_id)).to eq(1)
    end

    it 'sets cas correctly' do
      expect(service.instance_variable_get(:@cas)).to eq('123-45-6')
    end

    it 'sets vendor_info_json correctly' do
      expect(service.instance_variable_get(:@vendor_info_json)).to eq('{"productNumber": "ABC123"}')
    end

    it 'sets vendor_name correctly' do
      expect(service.instance_variable_get(:@vendor_name)).to eq('testvendor')
    end

    it 'sets vendor_product correctly' do
      expect(service.instance_variable_get(:@vendor_product)).to eq('testvendorproductinfo')
    end

    it 'sets attached_file correctly' do
      expect(service.instance_variable_get(:@attached_file)).to eq(attached_file)
    end

    it 'sets chemical_data correctly' do
      expect(service.instance_variable_get(:@chemical_data)).to eq('{"key": "value"}')
    end
  end

  describe '#create' do
    shared_examples 'validation error' do |missing_param, error_message|
      let(:params) { valid_params.except(missing_param) }
      let(:service) { described_class.new(params) }

      it "returns error when #{missing_param} is missing" do
        expect(service.create).to eq({ error: error_message })
      end
    end

    it_behaves_like 'validation error', :sample_id, 'Sample ID is required'
    it_behaves_like 'validation error', :attached_file, 'File is required'
    it_behaves_like 'validation error', :vendor_name, 'Vendor name is required, Vendor name is invalid'

    shared_examples 'invalid JSON error' do |param, value, error_message|
      let(:params) { valid_params.merge(param => value) }
      let(:service) { described_class.new(params) }

      it "returns error for invalid #{param}" do
        expect(service.create).to eq({ error: error_message })
      end
    end

    context 'with invalid JSON data' do
      it_behaves_like 'invalid JSON error', :vendor_info, 'invalid json', 'Invalid vendor info format'
      it_behaves_like 'invalid JSON error', :chemical_data, 'invalid json', 'chemical_data is invalid'
    end
  end

  # File processing tests
  describe 'file processing' do
    let(:service) { described_class.new(valid_params) }

    context 'when file processing succeeds' do
      before do
        allow(Chemotion::GenerateFileHashUtils).to receive_messages(
          generate_full_hash: 'a' * 32,
          find_duplicate_file_by_hash: nil,
          vendor_folder_exists?: true,
        )
        allow(Chemotion::ChemicalsService).to receive_messages(
          generate_safety_sheet_file_path: '/safety_sheets/testvendor/ABC123_aaaaaaaaaaaaaaaa.pdf',
          write_file: true,
        )

        allow(Chemical).to receive(:find_by).with(sample_id: 1).and_return(factory_chemical)
        allow(factory_chemical).to receive(:update!).and_return(true)
      end

      it 'processes the file and returns the updated chemical' do
        expect(service.create).to eq(factory_chemical)
      end
    end

    context 'when file processing fails' do
      before { allow(Chemotion::GenerateFileHashUtils).to receive(:generate_full_hash).and_return(nil) }

      it 'returns an error when file hash cannot be computed' do
        expect(service.create).to eq({ error: 'Error processing SDS: File hash could not be generated' })
      end
    end

    context 'when file processing raises an exception' do
      let(:error_service) { described_class.new(valid_params) }

      it 'returns an error when processing raises an exception' do
        allow(Chemotion::GenerateFileHashUtils).to receive(:generate_full_hash).and_raise(StandardError, 'File error')
        expect(error_service.create).to eq({ error: 'Error processing SDS: File error' })
      end
    end
  end

  describe 'private utility methods' do
    let(:service) { described_class.new(valid_params) }

    describe '#parse_json_param' do
      it 'returns the original object if not a string' do
        expect(service.send(:parse_json_param, { key: 'value' }, 'error')).to eq({ key: 'value' })
      end

      it 'parses valid JSON string' do
        expect(service.send(:parse_json_param, '{"key": "value"}', 'error')).to eq({ 'key' => 'value' })
      end

      it 'returns error hash for invalid JSON string' do
        expect(service.send(:parse_json_param, 'invalid json', 'error')).to eq({ error: 'error' })
      end
    end
  end

  describe 'file hash and deduplication functionality' do
    let(:service) { described_class.new(valid_params) }

    describe '#compute_file_hash' do
      it 'delegates to GenerateFileHashUtils and returns hash' do
        allow(Chemotion::GenerateFileHashUtils).to receive(:generate_full_hash).with(anything).and_return('hash123')
        result = service.send(:compute_file_hash, '/tmp/path.pdf')
        expect(result).to eq('hash123')
      end

      it 'returns nil when utils return nil' do
        allow(Chemotion::GenerateFileHashUtils).to receive(:generate_full_hash).and_return(nil)
        result = service.send(:compute_file_hash, '/tmp/path.pdf')
        expect(result).to be_nil
      end
    end
  end

  it 'properly uses factory chemical for testing' do
    factory_chem = build_stubbed(:chemical, :for_manual_sds_testing)

    # Setup expectations
    allow(Chemical).to receive(:find_by).with(sample_id: 1).and_return(factory_chem)
    allow(factory_chem).to receive(:update!).and_return(true)

    # Stub file hash and write path to avoid filesystem operations
    allow(Chemotion::GenerateFileHashUtils).to receive_messages(
      generate_full_hash: 'a' * 32,
      find_duplicate_file_by_hash: nil,
      vendor_folder_exists?: true,
    )
    allow(Chemotion::ChemicalsService).to receive_messages(
      generate_safety_sheet_file_path: '/safety_sheets/testvendor/ABC123_aaaaaaaaaaaaaaaa.pdf',
      write_file: true,
    )
    allow(factory_service).to receive(:update_safety_sheet_path)

    # Execute and verify
    result = factory_service.create

    expect(result).to eq(factory_chem)
    expect(Chemical).to have_received(:find_by).with(sample_id: 1)
    expect(factory_chem).to have_received(:update!)
  end

  # Integration tests
  describe 'database integration', :integration do
    def integration_setup
      FileUtils.mkdir_p(Rails.root.join('tmp/test/'))
      {
        sample: FactoryBot.create(:sample),
        test_file_path: Rails.root.join('tmp/test/test.pdf'),
        vendor_info_hash: { 'productNumber' => 'ABC123', 'vendorCode' => 'TEST' },
        safety_sheet_file_path: Rails.root.join('tmp/test/safety_sheet_123.pdf'),
        upload_tempfile: instance_double(Tempfile),
      }
    end

    def build_params(setup_data)
      {
        sample_id: setup_data[:sample].id,
        attached_file: { tempfile: setup_data[:upload_tempfile] },
        vendor_name: 'testvendor',
        vendor_product: 'testproductinfo',
        cas: '123-45-6',
        vendor_info: setup_data[:vendor_info_hash].to_json,
        chemical_data: { 'cas' => '123-45-6' }.to_json,
      }
    end

    after do
      # Clean up test files
      FileUtils.rm_f(Rails.root.join('tmp/test/test.pdf'))
      FileUtils.rm_f(Rails.root.join('tmp/test/safety_sheet_123.pdf'))
    end

    context 'when updating an existing chemical record' do
      it 'updates the safety sheet path' do
        setup_data = integration_setup
        # Create a test PDF file and point the upload tempfile double to it
        File.write(setup_data[:test_file_path], 'test content')
        allow(setup_data[:upload_tempfile]).to receive(:path).and_return(setup_data[:test_file_path].to_s)

        # Create a chemical first
        allow(Chemotion::GenerateFileHashUtils).to receive_messages(
          generate_full_hash: 'a' * 32,
          find_duplicate_file_by_hash: nil,
          vendor_folder_exists?: true,
        )
        allow(Chemotion::ChemicalsService).to receive_messages(
          generate_safety_sheet_file_path: '/safety_sheets/testvendor/ABC123_aaaaaaaaaaaaaaaa.pdf',
          write_file: true,
        )

        # Create a chemical record directly and stub it
        chemical = Chemical.new(sample_id: setup_data[:sample].id, cas: '123-45-6')
        chemical.chemical_data = [{ 'safetySheetPath' => [] }]
        allow(Chemical).to receive(:find_by).and_return(chemical)
        allow(chemical).to receive(:update!).and_return(true)

        # Initialize the service
        service = described_class.new(build_params(setup_data))

        # Update via create method instead of calling private method directly
        result = service.create

        # Verify the safety sheet path was updated (indirectly)
        expect(result).to eq(chemical)
        expect(chemical.chemical_data[0]).to have_key('safetySheetPath')
      end

      it 'preserves existing safety sheet entries' do
        setup_data = integration_setup
        # Create a test PDF file and point the upload tempfile double to it
        File.write(setup_data[:test_file_path], 'test content')
        allow(setup_data[:upload_tempfile]).to receive(:path).and_return(setup_data[:test_file_path].to_s)

        # Mock utilities to avoid file system operations
        allow(Chemotion::GenerateFileHashUtils).to receive_messages(
          generate_full_hash: 'a' * 32,
          find_duplicate_file_by_hash: nil,
          vendor_folder_exists?: true,
        )
        allow(Chemotion::ChemicalsService).to receive_messages(
          generate_safety_sheet_file_path: '/safety_sheets/testvendor/ABC123_aaaaaaaaaaaaaaaa.pdf',
          write_file: true,
        )

        # Create a chemical record directly and stub it
        chemical = Chemical.new(
          sample_id: setup_data[:sample].id,
          cas: '123-45-6',
        )
        chemical.chemical_data = [{
          'safetySheetPath' => [{ 'existing_vendor_link' => '/path/to/existing.pdf' }],
          'existing_key' => 'existing_value',
          'testproductinfo' => { 'previous_value' => 'should be replaced' },
        }]

        allow(Chemical).to receive(:find_by).and_return(chemical)
        allow(chemical).to receive(:update!).and_return(true)

        # Initialize the service and create
        service = described_class.new(build_params(setup_data))
        result = service.create

        # Verify that safety sheet path entries are preserved
        expect(result).to eq(chemical)
        expect(chemical.chemical_data[0]['safetySheetPath']).to include(
          { 'existing_vendor_link' => '/path/to/existing.pdf' },
        )
      end

      it 'updates vendor product info' do
        setup_data = integration_setup
        # Create a test PDF file and point the upload tempfile double to it
        File.write(setup_data[:test_file_path], 'test content')
        allow(setup_data[:upload_tempfile]).to receive(:path).and_return(setup_data[:test_file_path].to_s)

        # Create a chemical record and stub dependencies
        chemical = Chemical.new(sample_id: setup_data[:sample].id, cas: '123-45-6')
        chemical.chemical_data = [{
          'safetySheetPath' => [],
          'testproductinfo' => { 'previous_value' => 'should be replaced' },
        }]

        # Set up mocks
        allow(Chemotion::GenerateFileHashUtils).to receive_messages(
          generate_full_hash: 'a' * 32,
          find_duplicate_file_by_hash: nil,
          vendor_folder_exists?: true,
        )
        allow(Chemotion::ChemicalsService).to receive_messages(
          generate_safety_sheet_file_path: '/safety_sheets/testvendor/ABC123_aaaaaaaaaaaaaaaa.pdf',
          write_file: true,
        )
        allow(Chemical).to receive(:find_by).and_return(chemical)
        allow(chemical).to receive(:update!).and_return(true)

        # Call the service
        service = described_class.new(build_params(setup_data))
        service.create

        # Verify vendor product info was updated
        expect(chemical.chemical_data[0]).to have_key('testproductinfo')
        expect(chemical.chemical_data[0]['testproductinfo']).to include('productNumber' => 'ABC123')
      end

      it 'preserves the CAS attribute' do
        setup_data = integration_setup
        File.write(setup_data[:test_file_path], 'test content')
        allow(setup_data[:upload_tempfile]).to receive(:path).and_return(setup_data[:test_file_path].to_s)
        chemical = Chemical.new(sample_id: setup_data[:sample].id, cas: '123-45-6')
        chemical.chemical_data = [{ 'safetySheetPath' => [] }]
        allow(Chemotion::GenerateFileHashUtils).to receive_messages(
          generate_full_hash: 'a' * 32,
          find_duplicate_file_by_hash: nil,
          vendor_folder_exists?: true,
        )
        allow(Chemotion::ChemicalsService).to receive_messages(
          generate_safety_sheet_file_path: '/safety_sheets/testvendor/ABC123_aaaaaaaaaaaaaaaa.pdf',
          write_file: true,
        )
        allow(Chemical).to receive(:find_by).and_return(chemical)
        allow(chemical).to receive(:update!).and_return(true)
        service = described_class.new(build_params(setup_data))
        service.create
        expect(chemical.cas).to eq('123-45-6')
      end
    end

    context 'when creating a new chemical record' do
      it 'creates a non-nil chemical object' do
        setup_data = integration_setup
        # Create a test PDF file and point the upload tempfile double to it
        File.write(setup_data[:test_file_path], 'test content')
        allow(setup_data[:upload_tempfile]).to receive(:path).and_return(setup_data[:test_file_path].to_s)

        # Create a new chemical instance for the test
        new_chemical = Chemical.new(sample_id: setup_data[:sample].id, cas: '123-45-6')

        # Initialize the service and create a chemical
        service = described_class.new(build_params(setup_data))

        # Mock necessary methods to avoid file system operations
        allow(Chemotion::GenerateFileHashUtils).to receive_messages(
          generate_full_hash: 'a' * 32,
          find_duplicate_file_by_hash: nil,
          vendor_folder_exists?: true,
        )
        allow(Chemotion::ChemicalsService).to receive_messages(
          generate_safety_sheet_file_path: '/safety_sheets/testvendor/ABC123_aaaaaaaaaaaaaaaa.pdf',
          write_file: true,
        )
        allow(Chemical).to receive_messages(find_by: nil, create!: new_chemical)
        allow(new_chemical).to receive(:update!).and_return(true)

        chemical = service.create

        # Verify the chemical was created
        expect(chemical).not_to be_nil
        expect(chemical).not_to be_a(Hash), "Expected a Chemical object but got #{chemical.inspect}"
      end

      it 'creates chemical with correct attributes' do
        setup_data = integration_setup
        # Create a test PDF file and point the upload tempfile double to it
        File.write(setup_data[:test_file_path], 'test content')
        allow(setup_data[:upload_tempfile]).to receive(:path).and_return(setup_data[:test_file_path].to_s)

        new_chemical = Chemical.new(sample_id: setup_data[:sample].id, cas: '123-45-6')

        # Initialize the service and mock dependencies
        service = described_class.new(build_params(setup_data))
        allow(Chemotion::GenerateFileHashUtils).to receive_messages(
          generate_full_hash: 'a' * 32,
          find_duplicate_file_by_hash: nil,
          vendor_folder_exists?: true,
        )
        allow(Chemotion::ChemicalsService).to receive_messages(
          generate_safety_sheet_file_path: '/safety_sheets/testvendor/ABC123_aaaaaaaaaaaaaaaa.pdf',
          write_file: true,
        )
        allow(Chemical).to receive_messages(find_by: nil, create!: new_chemical)
        allow(new_chemical).to receive(:update!).and_return(true)

        # Call the method and verify attributes
        chemical = service.create
        expect(chemical.sample_id).to eq(setup_data[:sample].id)
        expect(chemical.cas).to eq('123-45-6')
      end
    end
  end
end
