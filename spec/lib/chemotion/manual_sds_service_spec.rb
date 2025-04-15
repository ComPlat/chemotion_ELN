# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::ManualSdsService do
  # Common setup shared across examples
  let(:attached_file) do
    instance_double(
      ActionDispatch::Http::UploadedFile,
      read: 'test file content',
      original_filename: 'test.pdf',
    )
  end

  let(:sample) { build_stubbed(:valid_sample, id: 1) }

  let(:valid_params) do
    {
      sample_id: sample.id,
      cas: '123-45-6',
      vendor_info: '{"productNumber": "ABC123"}',
      vendor_name: 'Test Vendor',
      vendor_product: 'testVendorProductInfo',
      attached_file: attached_file,
      chemical_data: nil,
    }
  end

  let(:factory_chemical) { build_stubbed(:chemical, :for_manual_sds_testing) }

  let(:file_paths) { ['Test Vendor_ABC123.pdf', '/safety_sheets/Test Vendor_ABC123.pdf'] }

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
      expect(service.instance_variable_get(:@vendor_name)).to eq('Test Vendor')
    end

    it 'sets vendor_product correctly' do
      expect(service.instance_variable_get(:@vendor_product)).to eq('testVendorProductInfo')
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
    it_behaves_like 'validation error', :vendor_name, 'Vendor name is required'

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
        # Use class_double to avoid stubbing the subject
        allow(Chemotion::ChemicalsService).to receive(:create_sds_file).and_return(true)
        allow(Chemical).to receive(:find_by).with(sample_id: 1).and_return(factory_chemical)
        allow(factory_chemical).to receive(:update!).and_return(true)

        # Mock the private methods without stubbing the subject
        original_method = service.method(:generate_file_paths)
        allow(service).to receive(:generate_file_paths) do
          original_method.call
          file_paths
        end

        original_save = service.method(:save_sds_file)
        allow(service).to receive(:save_sds_file) do |*args|
          original_save.call(*args)
          true
        end

        original_update = service.method(:update_safety_sheet_path)
        allow(service).to receive(:update_safety_sheet_path) do |*args|
          original_update.call(*args)
        end
      end

      it 'processes the file and returns the updated chemical' do
        expect(service.create).to eq(factory_chemical)
      end
    end

    context 'when file processing fails' do
      before do
        allow(Chemotion::ChemicalsService).to receive(:create_sds_file).and_return(false)

        # Mock private method without stubbing subject
        original_method = service.method(:generate_file_paths)
        allow(service).to receive(:generate_file_paths) do
          original_method.call
          file_paths
        end
      end

      it 'returns an error when file saving fails' do
        expect(service.create).to eq({ error: 'Error saving file' })
      end
    end

    context 'when file processing raises an exception' do
      let(:error_service) { described_class.new(valid_params) }

      it 'returns an error when processing raises an exception' do
        # Mock generate_file_paths to raise an exception
        allow(error_service).to receive(:generate_file_paths).and_raise(StandardError, 'File error')

        # This should trigger the rescue in process_file
        expect(error_service.create).to eq({ error: 'Error processing SDS: File error' })
      end
    end
  end

  describe 'chemical record operations' do
    let(:service) { described_class.new(valid_params) }
    let(:chemical_with_nil_data) { instance_double(Chemical, chemical_data: nil) }

    let(:sds_params) do
      {
        sample_id: sample.id,
        cas: '123-45-6',
        vendor_info: { 'productNumber' => 'ABC123' },
        vendor_product: 'testVendorProductInfo',
        vendor_name_key: 'test_vendor_link',
        file_path: '/safety_sheets/test.pdf',
        chemical_data: nil,
      }
    end

    context 'when updating existing chemical' do
      before do
        allow(Chemical).to receive(:find_by).with(sample_id: 1).and_return(factory_chemical)
        allow(factory_chemical).to receive(:update!).and_return(true)
      end

      it 'returns the chemical when it exists' do
        # Create a test double for the service to avoid subject stubbing
        test_service = instance_double(described_class)
        allow(test_service).to receive(:handle_chemical_update_or_create).with(sds_params).and_return(factory_chemical)

        # Use class stub instead of subject stub
        allow(Chemical).to receive(:find_by).with(sample_id: 1).and_return(factory_chemical)

        result = service.send(:handle_chemical_update_or_create, sds_params)
        expect(result).to eq(factory_chemical)
      end

      it 'initializes chemical_data when nil' do
        # Create a properly configured chemical double with nil data that can receive chemical_data=
        chemical_with_nil_data = instance_double(Chemical, chemical_data: nil)
        allow(chemical_with_nil_data).to receive(:chemical_data=).with(any_args)
        allow(chemical_with_nil_data).to receive(:update!).and_return(true)

        allow(Chemical).to receive(:find_by).with(sample_id: 1).and_return(chemical_with_nil_data)

        # Create a service that will directly call the original methods
        service_for_init = described_class.new(valid_params)

        # Mock dependent methods to avoid deeper calls
        allow(service_for_init).to receive(:update_safety_sheet_entry)
        allow(service_for_init).to receive(:save_chemical).and_return(chemical_with_nil_data)

        result = service_for_init.send(:initialize_chemical_data,
                                       chemical_with_nil_data,
                                       { 'productNumber' => 'ABC123' },
                                       'testVendorProductInfo',
                                       'test_vendor_link',
                                       '/safety_sheets/test.pdf')

        expect(result).to eq(chemical_with_nil_data)
      end

      it 'handles update errors' do
        allow(factory_chemical).to receive(:update!).and_raise(StandardError, 'Update error')
        allow(Rails.logger).to receive(:error)

        result = service.send(:save_chemical, factory_chemical)
        expect(result).to include(error: 'Error updating chemical: Update error')
      end
    end

    context 'when creating new chemical' do
      let(:new_chemical) do
        instance_double(Chemical, sample_id: 1, cas: '123-45-6', chemical_data: [{ 'safetySheetPath' => [] }])
      end

      before do
        allow(Chemical).to receive(:find_by).with(sample_id: 1).and_return(nil)
        allow(Chemical).to receive(:create!).and_return(new_chemical)
      end

      it 'creates a new chemical when it does not exist' do
        # Use isolated object to avoid subject stubbing
        isolated_service = described_class.new(valid_params)
        def isolated_service.test_prepare_chemical_data(*)
          [{ 'safetySheetPath' => [] }]
        end

        result = service.send(:handle_chemical_update_or_create, sds_params)
        expect(result).to eq(new_chemical)
      end

      it 'handles creation errors' do
        allow(Chemical).to receive(:create!).and_raise(StandardError, 'Creation error')
        allow(Rails.logger).to receive(:error)

        result = service.send(:create_chemical, 1, '123-45-6', [{}])
        expect(result).to include(error: 'Error creating chemical: Creation error')
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

    describe '#generate_file_paths' do
      before do
        service.instance_variable_set(:@vendor_info, { 'productNumber' => 'ABC123' })
        service.instance_variable_set(:@vendor_name, 'Test Vendor')
      end

      it 'generates correct file name and path' do
        file_name, file_path = service.send(:generate_file_paths)
        expect(file_name).to eq('Test Vendor_ABC123.pdf')
        expect(file_path).to eq('/safety_sheets/Test Vendor_ABC123.pdf')
      end

      it 'handles missing productNumber in vendor_info' do
        service.instance_variable_set(:@vendor_info, {})

        file_name, file_path = service.send(:generate_file_paths)
        expect(file_name).to eq('Test Vendor_.pdf')
        expect(file_path).to eq('/safety_sheets/Test Vendor_.pdf')
      end
    end

    describe '#update_safety_sheet_entry' do
      it 'updates existing entry' do
        safety_sheet_path = [{ 'test_vendor_link' => '/old/path.pdf' }]
        service.send(
          :update_safety_sheet_entry,
          safety_sheet_path,
          'test_vendor_link',
          { 'test_vendor_link' => '/new/path.pdf' },
        )
        expect(safety_sheet_path).to eq([{ 'test_vendor_link' => '/new/path.pdf' }])
      end

      it 'adds new entry if not exists' do
        safety_sheet_path = []
        service.send(
          :update_safety_sheet_entry,
          safety_sheet_path,
          'test_vendor_link',
          { 'test_vendor_link' => '/new/path.pdf' },
        )
        expect(safety_sheet_path).to eq([{ 'test_vendor_link' => '/new/path.pdf' }])
      end

      it 'handles multiple entries' do
        safety_sheet_path = [
          { 'vendor1_link' => '/path1.pdf' },
          { 'vendor2_link' => '/path2.pdf' },
        ]
        service.send(
          :update_safety_sheet_entry,
          safety_sheet_path,
          'vendor2_link',
          { 'vendor2_link' => '/new-path2.pdf' },
        )
        expect(safety_sheet_path).to eq([
                                          { 'vendor1_link' => '/path1.pdf' },
                                          { 'vendor2_link' => '/new-path2.pdf' },
                                        ])
      end
    end

    describe '#update_chemical_data tests' do
      let(:service) { described_class.new(valid_params) }
      let(:chemical) do
        instance_double(
          Chemical,
          chemical_data: [{ 'safetySheetPath' => [{ 'existing_vendor' => '/path/to/file.pdf' }] }],
        )
      end
      let(:vendor_product) { 'testVendorProductInfo' }
      let(:vendor_info) { { 'productNumber' => 'ABC123' } }

      it 'preserves safety sheet path with standard data' do
        service.send(:update_chemical_data, chemical, { 'newKey' => 'newValue' }, vendor_product, vendor_info)
        expect(chemical.chemical_data[0]['safetySheetPath']).to eq([{ 'existing_vendor' => '/path/to/file.pdf' }])
      end

      it 'updates with new data (standard format)' do
        service.send(:update_chemical_data, chemical, { 'newKey' => 'newValue' }, vendor_product, vendor_info)
        expect(chemical.chemical_data[0]['newKey']).to eq('newValue')
      end

      it 'adds vendor product info (standard format)' do
        service.send(:update_chemical_data, chemical, { 'newKey' => 'newValue' }, vendor_product, vendor_info)
        expect(chemical.chemical_data[0][vendor_product]).to eq(vendor_info)
      end

      it 'preserves safety sheet path with array data' do
        service.send(:update_chemical_data, chemical, [{ 'newKey' => 'newValue' }], vendor_product, vendor_info)
        expect(chemical.chemical_data[0]['safetySheetPath']).to eq([{ 'existing_vendor' => '/path/to/file.pdf' }])
      end

      it 'updates with new data (array format)' do
        service.send(:update_chemical_data, chemical, [{ 'newKey' => 'newValue' }], vendor_product, vendor_info)
        expect(chemical.chemical_data[0]['newKey']).to eq('newValue')
      end

      it 'adds vendor product info (array format)' do
        service.send(:update_chemical_data, chemical, [{ 'newKey' => 'newValue' }], vendor_product, vendor_info)
        expect(chemical.chemical_data[0][vendor_product]).to eq(vendor_info)
      end

      it 'returns true when successful' do
        result = service.send(:update_chemical_data, chemical, { 'newKey' => 'newValue' }, vendor_product, vendor_info)
        expect(result).to be(true)
      end

      it 'handles errors gracefully' do
        # Create a new chemical double that will raise an error when modifying chemical_data
        error_chemical = instance_double(Chemical)
        allow(error_chemical).to receive(:chemical_data).and_return([{}])

        # Make the hash key access raise an error
        allow(error_chemical.chemical_data[0]).to receive(:[])
          .with('safetySheetPath')
          .and_raise(StandardError, 'Test error')
        allow(Rails.logger).to receive(:error)

        result = service.send(
          :update_chemical_data,
          error_chemical,
          { 'newKey' => 'newValue' },
          vendor_product,
          vendor_info,
        )

        expect(result).to eq({ error: 'chemical_data is invalid' })
        expect(Rails.logger).to have_received(:error).with(/Error processing chemical_data: Test error/)
      end
    end

    describe '#process_existing_chemical_data tests' do
      let(:service) { described_class.new(valid_params) }
      let(:chem_data_params) do
        {
          vendor_info: { 'productNumber' => 'ABC123' },
          vendor_product: 'testVendorProductInfo',
          vendor_name_key: 'test_vendor_link',
          file_path: '/safety_sheets/test.pdf',
        }
      end

      it 'returns array data structure' do
        chemical_data = { 'safetySheetPath' => [] }
        result = service.send(
          :process_existing_chemical_data,
          chemical_data,
          chem_data_params[:vendor_info],
          chem_data_params[:vendor_product],
          chem_data_params[:vendor_name_key],
          chem_data_params[:file_path],
        )

        expect(result).to be_an(Array)
      end

      it 'adds safety sheet path' do
        chemical_data = { 'safetySheetPath' => [] }
        result = service.send(
          :process_existing_chemical_data,
          chemical_data,
          chem_data_params[:vendor_info],
          chem_data_params[:vendor_product],
          chem_data_params[:vendor_name_key],
          chem_data_params[:file_path],
        )

        path_key = chem_data_params[:vendor_name_key]
        path_val = chem_data_params[:file_path]
        expect(result[0]['safetySheetPath']).to contain_exactly({ path_key => path_val })
      end

      it 'adds vendor product info' do
        chemical_data = { 'safetySheetPath' => [] }
        result = service.send(
          :process_existing_chemical_data,
          chemical_data,
          chem_data_params[:vendor_info],
          chem_data_params[:vendor_product],
          chem_data_params[:vendor_name_key],
          chem_data_params[:file_path],
        )

        expect(result[0][chem_data_params[:vendor_product]]).to eq(chem_data_params[:vendor_info])
      end

      it 'processes array-format chemical_data correctly' do
        array_chemical_data = [{ 'safetySheetPath' => [] }]
        result = service.send(
          :process_existing_chemical_data,
          array_chemical_data,
          chem_data_params[:vendor_info],
          chem_data_params[:vendor_product],
          chem_data_params[:vendor_name_key],
          chem_data_params[:file_path],
        )

        expect(result).to be_an(Array)
        path_key = chem_data_params[:vendor_name_key]
        path_val = chem_data_params[:file_path]
        expect(result[0]['safetySheetPath']).to contain_exactly({ path_key => path_val })
      end

      it 'initializes safetySheetPath when nil' do
        nil_path_data = [{ 'other_key' => 'value' }]
        result = service.send(
          :process_existing_chemical_data,
          nil_path_data,
          chem_data_params[:vendor_info],
          chem_data_params[:vendor_product],
          chem_data_params[:vendor_name_key],
          chem_data_params[:file_path],
        )

        path_key = chem_data_params[:vendor_name_key]
        path_val = chem_data_params[:file_path]
        expect(result[0]['safetySheetPath']).to contain_exactly({ path_key => path_val })
      end

      it 'handles errors gracefully' do
        chemical_data = { 'safetySheetPath' => [] }
        allow(service).to receive(:update_safety_sheet_entry).and_raise(StandardError, 'Test error')
        allow(Rails.logger).to receive(:error)

        result = service.send(
          :process_existing_chemical_data,
          chemical_data,
          chem_data_params[:vendor_info],
          chem_data_params[:vendor_product],
          chem_data_params[:vendor_name_key],
          chem_data_params[:file_path],
        )

        expect(result).to eq({ error: 'chemical_data is invalid' })
        expect(Rails.logger).to have_received(:error).with(/Error processing chemical_data: Test error/)
      end
    end
  end

  describe 'using factory traits' do
    let(:factory_service) { described_class.new(valid_params) }

    it 'properly uses factory chemical for testing' do
      factory_chem = build_stubbed(:chemical, :for_manual_sds_testing)

      # Setup expectations
      allow(Chemical).to receive(:find_by).with(sample_id: 1).and_return(factory_chem)
      allow(factory_chem).to receive(:update!).and_return(true)

      # Mock necessary methods to focus on factory usage
      allow(factory_service).to receive_messages(generate_file_paths: file_paths, save_sds_file: true)
      allow(factory_service).to receive(:update_safety_sheet_path)
      allow(Chemotion::ChemicalsService).to receive(:create_sds_file).and_return(true)

      # Execute and verify
      result = factory_service.create

      expect(result).to eq(factory_chem)
      expect(Chemical).to have_received(:find_by).with(sample_id: 1)
      expect(factory_chem).to have_received(:update!)
    end
  end
end
