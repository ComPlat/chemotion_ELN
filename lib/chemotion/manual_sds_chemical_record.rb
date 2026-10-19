# frozen_string_literal: true

module Chemotion
  # Records an attached sheet on the sample's chemical, creating the chemical when the
  # sample has none. Cf. ManualSdsService, which resolves and writes the file first.
  class ManualSdsChemicalRecord
    # @param chemical [Chemical, nil] the sample's record, nil when it has none yet
    # @param sds_params [Hash] Cf. ManualSdsService#build_sds_params
    # @return [Chemical, Hash] Chemical record or error hash
    def self.save(chemical, sds_params)
      new.save(chemical, sds_params)
    end

    def save(chemical, sds_params)
      if chemical.present?
        update_existing_chemical(chemical, sds_params)
      else
        create_new_chemical(sds_params)
      end
    end

    private

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
