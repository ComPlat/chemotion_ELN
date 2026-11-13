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
      # Parsed first: the link and product number checks read the decoded vendor_info.
      parsing_result = parse_data
      return parsing_result if parsing_result.is_a?(Hash) && parsing_result[:error]

      validation_errors = validate_params
      return { error: validation_errors.join(', ') } if validation_errors.any?
      return ChemicalsService.sds_limit_error('attaching') if ChemicalsService.sds_limit_reached?(sheets_held)

      # Process SDS file and create/update chemical record
      process_file
    end

    private

    # The record's own sheets decide the cap when the sample has one, since the update
    # keeps those and discards the posted list. The posted copy only counts before then.
    def sheets_held
      return chemical_record.chemical_data if chemical_record&.chemical_data.present?

      [@chemical_data]
    end

    # Validate required parameters and basic formats.
    # Checks performed:
    #  - presence: sample_id, attached_file, vendor_name
    #  - format: vendor_name (InputValidationUtils.valid_vendor_name?)
    #  - format: vendor_product (InputValidationUtils.valid_product_number?)
    #  - vendor_info: a Hash whose productNumber can name a file, with valid links if given
    # @return [Array<String>] empty array if valid; otherwise list of error messages
    def validate_params
      errors = []
      errors.concat(validate_presence_errors)
      errors.concat(validate_format_errors)
      errors.concat(validate_vendor_info)
      errors
    end

    # The product number becomes part of the file name on disk.
    def validate_vendor_info
      return ['Vendor info must be an object'] unless @vendor_info.is_a?(Hash)

      errors = validate_vendor_info_links
      unless ChemicalsService.valid_sheet_product_number?(@vendor_info['productNumber'])
        errors << 'Vendor info product number is invalid'
      end
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
      return ChemicalsService.duplicate_sheet_error(sds_file_path) if already_held?(sds_file_path)

      ManualSdsChemicalRecord.save(chemical_record, build_sds_params(product_number, sds_file_path))
    rescue StandardError => e
      { error: "Error processing SDS: #{e.message}" }
    end

    # Read from the record rather than the posted copy: the sheets the sample holds are
    # what decides, and chemical_data is optional on this endpoint.
    def already_held?(file_path)
      return false if chemical_record.nil?

      ChemicalsService.sheet_already_saved?(chemical_record.chemical_data, file_path)
    end

    # One lookup serves both the duplicate check and the update that follows it.
    def chemical_record
      return @chemical_record if defined?(@chemical_record)

      @chemical_record = Chemical.find_by(sample_id: @sample_id)
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
      existing = GenerateFileHashUtils.find_identical_sheet(fetch_upload_path)
      return existing if existing.present?

      path = Chemotion::ChemicalsService.generate_safety_sheet_file_path(
        @vendor_name,
        product_number,
        @file_hash[0..15],
      )
      Chemotion::ChemicalsService.write_file(path, @attached_file)
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
  end
end
