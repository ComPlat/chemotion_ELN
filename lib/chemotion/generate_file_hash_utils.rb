# frozen_string_literal: true

require 'digest'

module Chemotion
  # Utility module for file hash operations shared across safety sheet processing
  module GenerateFileHashUtils
    SAFETY_SHEETS_DIR = 'public/safety_sheets'
    # Generate full MD5 hash for file content
    # @param file_path [String] Path to the file
    # @return [String, nil] Full MD5 hash or nil if error
    def self.generate_full_hash(file_path)
      return nil unless File.exist?(file_path) && File.readable?(file_path)

      Digest::MD5.file(file_path).hexdigest
    rescue StandardError => e
      Rails.logger.error "Error generating full hash for #{file_path}: #{e.full_message}"
      nil
    end

    # Generate MD5 hash initials (first 16 characters) from full hash
    # @param file_path [String] Path to the file
    # @param fallback_name [String, nil] Fallback name for hash generation if file doesn't exist
    # @return [String] First 16 characters of MD5 hash
    def self.generate_file_hash_initials(file_path, fallback_name = nil)
      # Try to generate hash from actual file content first
      full_hash = generate_full_hash(file_path)
      return full_hash[0..15] if full_hash

      # Fallback: generate initials from filename
      if fallback_name
        fallback_hash = Digest::MD5.hexdigest(fallback_name)
        fallback_hash[0..15]
      end
    rescue StandardError => e
      Rails.logger.warn "Could not generate initials for #{file_path}: #{e.full_message}"
      nil
    end

    # Extract initials (first 16 characters) from existing full hash
    # @param full_hash [String] Full MD5 hash string
    # @return [String] First 16 characters of the hash
    def self.extract_initials_from_hash(full_hash)
      return '' if full_hash.blank?

      full_hash[0..15]
    end

    # Check if a file with same content already exists globally
    # @param vendor_name [String] Vendor name
    # @param product_number [String] Product number
    # @param file_hash [String] MD5 hash of file content
    # @return [String, nil] Existing file path if found, nil otherwise
    def self.find_duplicate_file_by_hash(vendor_name, product_number, file_hash_initials)
      existing_files = find_safety_sheets_by_product_number(vendor_name, product_number)
      return nil if existing_files.empty?

      existing_files.each do |file_path|
        file_path.match(/#{product_number}_(?:web_)?([a-f0-9]{16})\.pdf$/) do |match|
          existing_hash_initials = match[1]
          return file_path.sub('public/', '/') if existing_hash_initials == file_hash_initials
        end
      end
      nil
    end

    # Find all safety sheet PDF files for a given vendor/product number.
    # Matches both regular and API-fetched (_web_) variants, e.g.:
    #   public/safety_sheets/merck/270709_4c82b57ffb35b49b.pdf
    #   public/safety_sheets/merck/270709_web_4c82b57ffb35b49b.pdf
    # @param vendor_name [String] Vendor folder name
    # @param product_number [String] Product number (prefix of filename)
    # @return [Array<String>] Absolute file paths (may be empty)
    def self.find_safety_sheets_by_product_number(vendor_name, product_number)
      return [] unless vendor_folder_exists?(vendor_name)

      pattern = "#{SAFETY_SHEETS_DIR}/#{vendor_name}/#{product_number}_*.pdf"
      Dir.glob(pattern)
    end

    # Check if a vendor folder exists under safety sheets root.
    # @param vendor_name [String]
    # @return [Boolean] true if folder exists
    def self.vendor_folder_exists?(vendor_name)
      vendor_folder = File.join(SAFETY_SHEETS_DIR, vendor_name)
      return true if Dir.exist?(vendor_folder)

      false
    end

    # Ensure vendor folder exists
    # @param vendor_name [String]
    # @return [void]
    def self.create_vendor_product_folder(vendor_name)
      vendor_folder = File.join(SAFETY_SHEETS_DIR, vendor_name)
      FileUtils.mkdir_p(vendor_folder)
    end
  end
end
