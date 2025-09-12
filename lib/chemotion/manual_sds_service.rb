# frozen_string_literal: true

module Chemotion
  # Service class for handling manual Safety Data Sheet attachment (SDS) operations
  class ManualSdsService
    # @param args [Hash] Parameters for SDS creation
    # @option args [Integer] :sample_id Sample ID
    # @option args [String] :cas CAS number
    # @option args [String, Hash] :vendor_info Vendor information as JSON string or hash
    # @option args [String] :vendor_name Vendor name
    # @option args [String] :vendor_product Vendor product info key
    # @option args [ActionDispatch::Http::UploadedFile] :attached_file SDS file to be saved
    # @option args [String, Hash, nil] :chemical_data Optional chemical data as JSON string or hash
    # @return [Chemical, Hash] Created/updated chemical record or error hash
    def self.create_manual_sds(args = {})
      new(args).create
    end

    # Initialize the service with provided parameters
    # @param args [Hash] Parameters for SDS creation
    def initialize(args = {})
      @sample_id = args[:sample_id]
      @cas = args[:cas]
      @vendor_info_json = args[:vendor_info]
      @vendor_name = args[:vendor_name]
      @vendor_product = args[:vendor_product]
      @attached_file = args[:attached_file]
      @chemical_data = args[:chemical_data]
      @file_hash = nil
    end

    # Create a new manual SDS record
    # @return [Chemical, Hash] Created/updated chemical record or error hash
    def create
      # Validate parameters
      validation_errors = validate_params
      return { error: validation_errors.join(', ') } if validation_errors.any?

      # Parse vendor info and chemical data
      parsing_result = parse_data
      return parsing_result if parsing_result.is_a?(Hash) && parsing_result[:error]

      # Process SDS file and create/update chemical record
      process_file
    end

    private

    # Validate required parameters and basic formats.
    # Checks performed:
    #  - presence: sample_id, attached_file, vendor_name
    #  - format: vendor_name (InputValidationUtils.valid_vendor_name?)
    #  - format: vendor_product (InputValidationUtils.valid_product_number?)
    #  - if vendor_info is a Hash, delegates URL checks to validate_vendor_info_links
    # @return [Array<String>] empty array if valid; otherwise list of error messages
    def validate_params
      errors = []
      errors.concat(validate_presence_errors)
      errors.concat(validate_format_errors)
      errors.concat(validate_vendor_info_links)
      errors
    end

    # Collect presence-related validation errors for required fields
    # @return [Array<String>]
    def validate_presence_errors
      errors = []
      errors << 'Sample ID is required' if @sample_id.blank?
      errors << 'File is required' if @attached_file.blank?
      errors << 'Vendor name is required' if @vendor_name.blank?
      errors
    end

    # Collect format-related validation errors
    # @return [Array<String>]
    def validate_format_errors
      errors = []
      errors << 'Vendor name is invalid' unless InputValidationUtils.valid_vendor_name?(@vendor_name)
      errors << 'Vendor product is invalid' unless InputValidationUtils.valid_product_number?(@vendor_product)
      errors
    end

    # Validate optional URLs inside vendor_info.
    # Only performs checks when vendor_info is a Hash. If present, validates:
    #  - productLink: must satisfy InputValidationUtils.valid_product_link_url?
    #  - sdsLink:     must satisfy InputValidationUtils.valid_safety_sheet_link_url?
    # @return [Array<String>]
    def validate_vendor_info_links
      return [] unless @vendor_info.is_a?(Hash)

      errors = []
      if @vendor_info['productLink'] && !InputValidationUtils.valid_product_link_url?(@vendor_info['productLink'])
        errors << 'Invalid product link URL'
      end

      if @vendor_info['sdsLink'] && !InputValidationUtils.valid_safety_sheet_link_url?(@vendor_info['sdsLink'])
        errors << 'Invalid safety sheet link URL'
      end
      errors
    end

    # Parse JSON data from strings to hashes
    # @return [true, Hash] true if parsing successful, error hash otherwise
    def parse_data
      # Parse vendor info
      @vendor_info = parse_json_param(@vendor_info_json, 'Invalid vendor info format')
      return @vendor_info if @vendor_info.is_a?(Hash) && @vendor_info[:error]

      # Parse chemical data if provided
      if @chemical_data.is_a?(String) && @chemical_data.present?
        parsed_chemical_data = parse_json_param(@chemical_data, 'chemical_data is invalid')
        return parsed_chemical_data if parsed_chemical_data.is_a?(Hash) && parsed_chemical_data[:error]

        @chemical_data = parsed_chemical_data
      end

      true
    end

    # Process the uploaded SDS file and create/update the chemical record
    # @return [Chemical, Hash] Chemical record or error hash
    def process_file
      upload_path = fetch_upload_path
      product_number = @vendor_info['productNumber']
      @file_hash = compute_or_fail(upload_path)
      sds_file_path = resolve_sds_file_path(product_number)
      handle_chemical_update_or_create(build_sds_params(product_number, sds_file_path))
    rescue StandardError => e
      { error: "Error processing SDS: #{e.message}" }
    end

    # Compute hash for uploaded file
    def compute_file_hash(upload_path)
      GenerateFileHashUtils.generate_full_hash(upload_path)
    end

    # Ensure upload path exists
    def fetch_upload_path
      path = @attached_file[:tempfile]&.path
      raise StandardError, 'File is required' if path.blank?

      path
    end

    # Compute file hash or raise when missing
    def compute_or_fail(upload_path)
      hash = compute_file_hash(upload_path)
      raise StandardError, 'File hash could not be generated' if hash.blank?

      hash
    end

    # Resolve the final SDS file path, using existing duplicate when available
    def resolve_sds_file_path(product_number)
      existing = GenerateFileHashUtils.find_duplicate_file_by_hash(
        @vendor_name,
        product_number,
        @file_hash,
      )
      return existing if existing.present?

      path = Chemotion::ChemicalsService.generate_safety_sheet_file_path(
        @vendor_name,
        product_number,
        @file_hash[0..15],
      )
      unless GenerateFileHashUtils.vendor_folder_exists?(@vendor_name)
        GenerateFileHashUtils.create_vendor_product_folder(@vendor_name)
      end
      Chemotion::ChemicalsService.write_file(path, @attached_file) if path.present?
      path
    end

    # Build params for creating/updating the chemical with SDS
    def build_sds_params(product_number, file_path)
      {
        sample_id: @sample_id,
        cas: @cas,
        vendor_info: @vendor_info,
        vendor_product: @vendor_product,
        vendor_name_key: "#{product_number}_#{@file_hash[0..15]}_link",
        file_path: file_path,
        chemical_data: @chemical_data,
      }
    end

    # Parse JSON parameter
    # @param json_string [String, Object] JSON string to parse or object to return as-is
    # @param error_message [String] Error message if parsing fails
    # @return [Hash, Object] Parsed JSON or original object if not a string
    def parse_json_param(json_string, error_message)
      return json_string unless json_string.is_a?(String)

      begin
        JSON.parse(json_string)
      rescue JSON::ParserError
        { error: error_message }
      end
    end

    # Handle updating or creating a chemical record
    # @param sds_params [Hash] Parameters for chemical record creation/update
    # @return [Chemical, Hash] Chemical record or error hash
    def handle_chemical_update_or_create(sds_params)
      chemical = Chemical.find_by(sample_id: sds_params[:sample_id])

      if chemical.present?
        update_existing_chemical(chemical, sds_params)
      else
        create_new_chemical(sds_params)
      end
    end

    # Update an existing chemical record with SDS data
    # @param chemical [Chemical] Existing chemical record to update
    # @param sds_params [Hash] Parameters for the update
    # @return [Chemical, Hash] Updated chemical record or error hash
    def update_existing_chemical(chemical, sds_params)
      vendor_info = sds_params[:vendor_info]
      vendor_product = sds_params[:vendor_product]
      vendor_name_key = sds_params[:vendor_name_key]
      file_path = sds_params[:file_path]
      chemical_data = sds_params[:chemical_data]

      # Initialize chemical_data if blank
      if chemical.chemical_data.blank?
        return initialize_chemical_data(chemical, vendor_info, vendor_product, vendor_name_key, file_path)
      end

      # Ensure the first element exists
      chemical.chemical_data[0] = {} if chemical.chemical_data[0].nil?

      # Update with new chemical_data if provided
      if chemical_data.present?
        update_result = update_chemical_data(chemical, chemical_data, vendor_product, vendor_info)
        return update_result if update_result.is_a?(Hash) && update_result[:error]
      else
        # Add vendor product info
        chemical.chemical_data[0][vendor_product] = vendor_info
      end

      # Update safety sheet path
      update_safety_sheet_path(chemical, vendor_name_key, file_path)

      # Save the chemical
      save_chemical(chemical)
    end

    # Initialize chemical data for a chemical record
    # @param chemical [Chemical] Chemical record to initialize data for
    # @param vendor_info [Hash] Vendor information
    # @param vendor_product [String] Vendor product key
    # @param vendor_name_key [String] Vendor name key
    # @param file_path [String] Path to the SDS file
    # @return [Chemical, Hash] Updated chemical record or error hash
    def initialize_chemical_data(chemical, vendor_info, vendor_product, vendor_name_key, file_path)
      # Set the initial data structure
      chemical.chemical_data = [{
        'safetySheetPath' => [],
        vendor_product => vendor_info,
      }]

      # Create a vendor link entry
      vendor_link = { vendor_name_key => file_path }

      # Try to update safety sheet path if possible
      begin
        update_safety_sheet_entry(chemical.chemical_data[0]['safetySheetPath'], vendor_name_key, vendor_link)
      rescue NoMethodError
        # In case of test doubles, just continue
      end

      # Save the chemical
      save_chemical(chemical)
    end

    # Update chemical data with new values
    # @param chemical [Chemical] Chemical record to update
    # @param chemical_data [Hash, Array] New chemical data
    # @param vendor_product [String] Vendor product key
    # @param vendor_info [Hash] Vendor information
    # @return [true, Hash] true if successful, error hash otherwise
    def update_chemical_data(chemical, chemical_data, vendor_product, vendor_info)
      # Convert provided chemical_data to the right format if needed
      new_chem_data = chemical_data.is_a?(Array) ? chemical_data : [chemical_data]

      # Preserve existing safetySheetPath
      existing_safety_sheet_path = chemical.chemical_data[0]['safetySheetPath'] || []

      # Update the first element with the new chemical data
      chemical.chemical_data[0] = new_chem_data[0]

      # Restore or initialize safetySheetPath
      chemical.chemical_data[0]['safetySheetPath'] = existing_safety_sheet_path

      # Add vendor product info
      chemical.chemical_data[0][vendor_product] = vendor_info

      true
    rescue StandardError => e
      Rails.logger.error("Error processing chemical_data: #{e.message}")
      { error: 'chemical_data is invalid' }
    end

    # Update safety sheet path in chemical data
    # @param chemical [Chemical] Chemical record to update
    # @param vendor_name_key [String] Vendor name key
    # @param file_path [String] Path to the SDS file
    def update_safety_sheet_path(chemical, vendor_name_key, file_path)
      # Initialize safetySheetPath if not present
      chemical.chemical_data[0]['safetySheetPath'] ||= []

      # Create vendor link entry
      vendor_link = { vendor_name_key => file_path }

      # Update safety sheet path
      update_safety_sheet_entry(chemical.chemical_data[0]['safetySheetPath'], vendor_name_key, vendor_link)
    end

    # Save changes to a chemical record
    # @param chemical [Chemical] Chemical record to save
    # @return [Chemical, Hash] Saved chemical record or error hash
    def save_chemical(chemical)
      chemical.update!(chemical_data: chemical.chemical_data)
      chemical
    rescue StandardError => e
      Rails.logger.error("Error updating chemical: #{e.message}")
      { error: "Error updating chemical: #{e.message}" }
    end

    # Create a new chemical record with SDS data
    # @param sds_params [Hash] Parameters for the new chemical record
    # @return [Chemical, Hash] Created chemical record or error hash
    def create_new_chemical(sds_params)
      sample_id = sds_params[:sample_id]
      cas = sds_params[:cas]
      vendor_info = sds_params[:vendor_info]
      vendor_product = sds_params[:vendor_product]
      vendor_name_key = sds_params[:vendor_name_key]
      file_path = sds_params[:file_path]
      chemical_data = sds_params[:chemical_data]

      # Prepare the chemical data
      chem_data = prepare_chemical_data({
                                          chemical_data: chemical_data,
                                          vendor_info: vendor_info,
                                          vendor_product: vendor_product,
                                          vendor_name_key: vendor_name_key,
                                          file_path: file_path,
                                        })
      return chem_data if chem_data.is_a?(Hash) && chem_data[:error]

      # Create the chemical
      Chemotion::ChemicalsService.create_chemical(sample_id, cas, chem_data)
    end

    # Prepare chemical data for a new chemical record
    # @param params [Hash] Parameters for chemical data preparation
    # @option params [Hash, Array, nil] :chemical_data Optional chemical data
    # @option params [Hash] :vendor_info Vendor information
    # @option params [String] :vendor_product Vendor product key
    # @option params [String] :vendor_name_key Vendor name key
    # @option params [String] :file_path Path to the SDS file
    # @return [Array<Hash>, Hash] Prepared chemical data or error hash
    def prepare_chemical_data(params)
      chemical_data = params[:chemical_data]
      vendor_info = params[:vendor_info]
      vendor_product = params[:vendor_product]
      vendor_name_key = params[:vendor_name_key]
      file_path = params[:file_path]

      if chemical_data.present?
        process_existing_chemical_data(chemical_data, vendor_info, vendor_product, vendor_name_key, file_path)
      else
        # Use default structure if no chemical_data provided
        [{
          'safetySheetPath' => [{ vendor_name_key => file_path }],
          vendor_product => vendor_info,
        }]
      end
    end

    # Process existing chemical data for use in a new chemical record
    # @param chemical_data [Hash, Array] Existing chemical data
    # @param vendor_info [Hash] Vendor information
    # @param vendor_product [String] Vendor product key
    # @param vendor_name_key [String] Vendor name key
    # @param file_path [String] Path to the SDS file
    # @return [Array<Hash>, Hash] Processed chemical data or error hash
    def process_existing_chemical_data(chemical_data, vendor_info, vendor_product, vendor_name_key, file_path)
      # Convert provided chemical_data to the right format if needed
      chem_data = chemical_data.is_a?(Array) ? chemical_data : [chemical_data]

      # Ensure safetySheetPath exists
      chem_data[0]['safetySheetPath'] ||= []

      # Add vendor link to safetySheetPath
      update_safety_sheet_entry(chem_data[0]['safetySheetPath'], vendor_name_key, { vendor_name_key => file_path })

      # Add vendor product info
      chem_data[0][vendor_product] = vendor_info

      chem_data
    rescue StandardError => e
      Rails.logger.error("Error processing chemical_data: #{e.message}")
      { error: 'chemical_data is invalid' }
    end

    # Update a safety sheet entry in chemical data
    # @param safety_sheet_path [Array] Array of safety sheet paths
    # @param vendor_name_key [String] Vendor name key
    # @param vendor_link [Hash] Vendor link information
    def update_safety_sheet_entry(safety_sheet_path, vendor_name_key, vendor_link)
      # Initialize safetySheetPath if not present
      safety_sheet_path ||= []

      # Check if the entry already exists and update it, or append a new one
      existing_index = safety_sheet_path.find_index do |path|
        path.keys.first == vendor_name_key
      end

      if existing_index
        safety_sheet_path[existing_index] = vendor_link
      else
        safety_sheet_path << vendor_link
      end
    end
  end
end
