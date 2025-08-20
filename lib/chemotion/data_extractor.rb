# frozen_string_literal: true

require_relative 'input_validation_utils'

module Chemotion
  # Data extraction utilities for parsing filenames and identifiers
  module DataExtractor
    # Extract vendor name from link key
    # @param link_key [String] Link key like "merck_link", "merck_v2_link"
    # @return [String] Vendor name
    # @note Examples:
    #   - "merck_link" -> "merck"
    #   - "merck_v2_link" -> "merck"
    #   - "sigma_aldrich_v3_link" -> "sigma_aldrich"
    # @example
    #   extract_vendor_from_link_key("merck_link")     #=> "merck"
    #   extract_vendor_from_link_key("merck_v2_link")  #=> "merck"
    def self.extract_vendor_from_link_key(link_key)
      return nil unless link_key.is_a?(String)

      # Remove "_link" suffix and any version suffix
      base_key = link_key.sub(/_link$/, '')
      base_key.sub(/_v\d+$/, '')
    end

    # Extract and validate vendor name from filename
    # @param filename [String] Filename to extract vendor from (e.g., "merck_product123.pdf")
    # @return [String, nil] Vendor name or nil if invalid/not found
    # @note Extraction process:
    #   1. Removes .pdf extension
    #   2. Splits by underscore and takes first part
    #   3. Converts to lowercase
    #   4. Validates against vendor name rules
    # @example
    #   extract_vendor_from_filename("merck_product123.pdf") #=> "merck"
    #   extract_vendor_from_filename("123invalid_test.pdf")  #=> nil (starts with digit)
    #   extract_vendor_from_filename("singlename.pdf")      #=> nil (no underscore)
    def self.extract_vendor_from_filename(filename)
      return nil unless filename.is_a?(String)

      # Remove .pdf extension
      base_name = filename.sub(/\.pdf$/, '')

      # Extract vendor name (everything before first underscore)
      parts = base_name.split('_')
      return nil if parts.length < 2

      vendor_name = parts[0].downcase

      return nil unless InputValidationUtils.valid_vendor_name?(vendor_name)

      vendor_name
    end

    # Extract and validate product number from filename after vendor removal
    # @param filename [String] Full filename (e.g., "merck_product123_hashInitials.pdf")
    # @param vendor_name [String] Already extracted and validated vendor name
    # @return [String, nil] Product number or nil if invalid/not found
    # @note Extraction process:
    #   1. Removes .pdf extension
    #   2. Removes vendor prefix
    #   3. Splits remaining by underscore and takes first part (before hash)
    #   4. Converts to lowercase
    #   5. Validates against product number rules
    # @example
    #   extract_product_number_from_filename("merck_prod123_a1b2c3.pdf", "merck") #=> "prod123"
    #   extract_product_number_from_filename("merck_12345_a1b2c3.pdf", "merck")   #=> nil (no letters)
    def self.extract_product_number_from_filename(filename, vendor_name)
      return nil unless filename.is_a?(String) && vendor_name.is_a?(String)

      # Remove .pdf extension
      base_name = filename.sub(/\.pdf$/, '')

      # Remove vendor prefix
      vendor_prefix = "#{vendor_name}_"
      return nil unless base_name.downcase.start_with?(vendor_prefix.downcase)

      # Extract product number (everything after vendor prefix, before hash initials)
      remaining = base_name[vendor_prefix.length..]

      # Split by underscore and take the first part (product number)
      parts = remaining.split('_')
      return nil if parts.empty?

      product_number = parts[0].downcase

      return nil unless InputValidationUtils.valid_product_number?(product_number)

      product_number
    end

    # Extract hash initials from filename (last part before .pdf)
    # @param filename [String] Filename containing hash initials
    # @return [String, nil] Hash initials or nil if not found/invalid
    # @note Expected format: "vendor_product_hashInitials.pdf"
    # @example
    #   extract_hash_initials_from_filename("merck_prod123_a1b2c3d4e5f6.pdf") #=> "a1b2c3d4e5f6"
    #   extract_hash_initials_from_filename("invalid_format.pdf")             #=> nil
    def self.extract_hash_initials_from_filename(filename)
      return nil unless filename.is_a?(String)

      # Remove .pdf extension
      base_name = filename.sub(/\.pdf$/, '')

      # Split by underscore and get last part
      parts = base_name.split('_')
      return nil if parts.length < 3 # Need at least vendor_product_hash

      hash_initials = parts.last

      # Validate hash format (16 hex characters)
      return nil unless hash_initials.match?(/\A[a-f0-9]{16}\z/)

      hash_initials
    end
  end
end
