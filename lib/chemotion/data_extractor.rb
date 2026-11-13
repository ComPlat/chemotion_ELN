# frozen_string_literal: true

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
  end
end
