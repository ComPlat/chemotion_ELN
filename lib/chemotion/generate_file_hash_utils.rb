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

    # The same sheet saved twice should be one file on disk. The scan covers every saved
    # sheet rather than this vendor and product alone, because the same PDF is published
    # under several catalogue numbers, and compares content rather than the name.
    # @param source_path [String] file to look for
    # @return [String, nil] the /safety_sheets/... path of a byte-identical file
    def self.find_identical_sheet(source_path)
      return nil unless File.file?(source_path)

      hash = generate_full_hash(source_path)
      return nil if hash.nil?

      # Every saved sheet carries the first 16 characters of its own content hash in its
      # name, so the candidates come from a glob rather than from hashing the whole folder.
      # A file renamed by hand is missed and stored again, which costs space, not accuracy.
      candidates = Dir.glob("#{SAFETY_SHEETS_DIR}/**/*#{hash[0..15]}.pdf")
      match = candidates.find { |candidate| generate_full_hash(candidate) == hash }
      match&.delete_prefix('public')
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
