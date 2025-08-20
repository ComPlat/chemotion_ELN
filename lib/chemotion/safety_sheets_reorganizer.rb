# frozen_string_literal: true

# !/usr/bin/env ruby

# Script to restructure safety_sheets folder by vendor subdirectories
# Run this from your Rails root directory

require 'fileutils'

# Safety Data Sheets folder reorganization utility
#
# This class provides functionality to reorganize PDF files in the safety_sheets directory
# into vendor-specific subdirectories with standardized naming conventions.
#
# Key features:
# - Moves files into vendor subdirectories based on filename prefix
# - Removes vendor prefixes from filenames
# - Adds MD5 hash initials for unique identification
# - Detects and handles duplicate files (identical content)
# - Creates versioned files for same product with different content
# - Comprehensive logging and statistics tracking
# - Automatic backup creation before processing
#
# @example Basic usage
#   SafetySheetsReorganizer.reorganize!
#
# @example File transformation
#   Before: public/safety_sheets/merck_product123_safety.pdf
#   After:  public/safety_sheets/merck/product123_a1b2c3d4e5f6.pdf
#
class SafetySheetsReorganizer
  SAFETY_SHEETS_DIR = 'public/safety_sheets'
  BACKUP_DIR = 'public/safety_sheets_backup'

  # Class method to create instance and run reorganization
  # @return [void]
  # @example
  #   SafetySheetsReorganizer.reorganize!
  def self.reorganize!
    new.reorganize!
  end

  # Initialize a new reorganizer instance with statistics tracking
  # @return [SafetySheetsReorganizer] New instance with empty statistics
  def initialize
    @stats = {
      total_files: 0,
      moved_files: 0,
      renamed_files: 0,
      skipped_files: 0,
      duplicates_removed: 0,
      versions_created: 0,
      errors: [],
    }
  end

  # Main reorganization workflow orchestrator
  #
  # Executes the complete reorganization process in the following order:
  # 1. Creates backup of existing directory
  # 2. Finds all PDF files in the root directory
  # 3. Moves files to vendor subdirectories
  # 4. Renames files to remove vendor prefixes and add hash initials
  # 5. Generates comprehensive summary report
  #
  # @return [void]
  # @raise [StandardError] If critical operations fail
  # @example
  #   reorganizer = SafetySheetsReorganizer.new
  #   reorganizer.reorganize!
  def reorganize!
    Rails.logger.info 'Starting safety sheets reorganization...'

    # Step 1: Create backup
    create_backup

    # Step 2: Get all PDF files
    pdf_files = find_pdf_files

    if pdf_files.empty?
      Rails.logger.info "No PDF files found in #{SAFETY_SHEETS_DIR}"
      return
    end

    @stats[:total_files] = pdf_files.length
    Rails.logger.info "Found #{@stats[:total_files]} PDF files to process"

    # Step 3: Process each file
    pdf_files.each do |file_path|
      process_file(file_path)
    end

    # Step 4: Rename files to remove vendor prefix
    rename_files_remove_vendor_prefix

    # Step 5: Print results
    print_summary

    Rails.logger.info 'Reorganization complete!'
  end

  private

  # Create backup of safety sheets directory before processing
  #
  # Creates a complete copy of the safety_sheets directory to safety_sheets_backup
  # for recovery purposes. Skips backup creation if backup already exists.
  #
  # @return [void]
  # @note Only creates backup if BACKUP_DIR doesn't already exist
  def create_backup
    return if Dir.exist?(BACKUP_DIR)

    Rails.logger.info "Creating backup at #{BACKUP_DIR}..."
    FileUtils.cp_r(SAFETY_SHEETS_DIR, BACKUP_DIR)
    Rails.logger.info 'Backup created successfully'
  end

  # Find all PDF files in the root safety sheets directory
  #
  # Searches for PDF files in the main directory while excluding files
  # that are already organized in subdirectories.
  #
  # @return [Array<String>] Array of absolute file paths to PDF files
  # @example
  #   find_pdf_files
  #   #=> ["/app/public/safety_sheets/merck_product.pdf", "/app/public/safety_sheets/sigma_test.pdf"]
  def find_pdf_files
    Dir.glob("#{SAFETY_SHEETS_DIR}/*.pdf").reject do |file|
      # Skip files that are already in subdirectories
      File.dirname(file) != SAFETY_SHEETS_DIR
    end
  end

  # Process individual PDF file for vendor extraction and movement
  #
  # Extracts vendor name from filename and moves file to appropriate vendor subdirectory.
  # Handles extraction failures gracefully by logging warnings and updating statistics.
  #
  # @param file_path [String] Absolute path to the PDF file to process
  # @return [void]
  # @raise [StandardError] Caught and logged, doesn't stop processing
  # @example
  #   process_file("/app/public/safety_sheets/merck_productNumber.pdf")
  #   Moves to: /app/public/safety_sheets/merck/merck_productNumber.pdf
  def process_file(file_path)
    filename = File.basename(file_path)
    # Extract vendor from filename
    vendor_name = Chemotion::DataExtractor.extract_vendor_from_filename(filename)

    if vendor_name.nil?
      Rails.logger.warn "Skipping #{filename} - cannot determine vendor"
      @stats[:skipped_files] += 1
      return
    end

    move_file_to_vendor_directory(file_path, vendor_name)
  rescue StandardError => e
    error_msg = "Error processing #{filename}: #{e.message}"
    Rails.logger.error error_msg
    @stats[:errors] << error_msg
  end

  # Move file to vendor-specific subdirectory
  #
  # Creates vendor subdirectory if it doesn't exist and moves the file there.
  # Checks for existing files at destination to prevent overwrites.
  #
  # @param file_path [String] Source file path
  # @param vendor_name [String] Validated vendor name for subdirectory
  # @return [void]
  # @note Updates statistics counters for moved_files or skipped_files
  # @example
  #   move_file_to_vendor_directory("/app/public/safety_sheets/merck_prod.pdf", "merck")
  #   # Creates: /app/public/safety_sheets/merck/merck_prod.pdf
  def move_file_to_vendor_directory(file_path, vendor_name)
    # Create vendor subdirectory if it doesn't exist
    vendor_dir = File.join(SAFETY_SHEETS_DIR, vendor_name)
    FileUtils.mkdir_p(vendor_dir) unless Dir.exist?(vendor_dir)

    # Determine new file path
    filename = File.basename(file_path)
    new_file_path = File.join(vendor_dir, filename)

    # Check if file already exists in destination
    if File.exist?(new_file_path)
      Rails.logger.warn "File already exists: #{new_file_path} - skipping"
      @stats[:skipped_files] += 1
      return
    end

    # Move the file
    FileUtils.mv(file_path, new_file_path)
    Rails.logger.info "Moved #{filename} → #{vendor_name}/"
    @stats[:moved_files] += 1
  end

  # Process all vendor directories to rename files and remove vendor prefixes
  #
  # Iterates through all subdirectories in the safety_sheets folder and processes
  # PDF files within each vendor directory to standardize naming.
  #
  # @return [void]
  # @note Skips hidden directories (starting with '.')
  # @example
  #   rename_files_remove_vendor_prefix
  #   # Processes: merck/, sigma/, fisher/ subdirectories
  def rename_files_remove_vendor_prefix
    Rails.logger.info 'Starting file renaming to remove vendor prefixes...'

    Dir.entries(SAFETY_SHEETS_DIR).each do |vendor_dir|
      next if vendor_dir.start_with?('.')

      vendor_path = File.join(SAFETY_SHEETS_DIR, vendor_dir)
      next unless Dir.exist?(vendor_path)

      process_vendor_directory(vendor_path, vendor_dir)
    end

    Rails.logger.info "Renamed #{@stats[:renamed_files]} files"
  end

  # Process all PDF files within a specific vendor directory
  #
  # Finds all PDF files in the given vendor directory and processes each one
  # to remove vendor prefixes and add hash initials.
  #
  # @param vendor_path [String] Absolute path to vendor subdirectory
  # @param vendor_name [String] Name of the vendor (used for prefix removal)
  # @return [void]
  # @example
  #   process_vendor_directory("/app/public/safety_sheets/merck", "merck")
  #   # Processes all PDF files in the merck subdirectory
  def process_vendor_directory(vendor_path, vendor_name)
    pdf_files = Dir.glob("#{vendor_path}/*.pdf")

    pdf_files.each do |file_path|
      rename_file_remove_vendor_prefix(file_path, vendor_name)
    rescue StandardError => e
      filename = File.basename(file_path)
      error_msg = "Error renaming #{filename}: #{e.message}"
      Rails.logger.error error_msg
      @stats[:errors] << error_msg
    end
  end

  # Rename individual file to remove vendor prefix and add hash initials
  #
  # Transforms filename from "vendor_product.pdf" to "product_hashInitials.pdf".
  # Handles duplicate detection by comparing file content hashes.
  #
  # @param file_path [String] Absolute path to file being renamed
  # @param vendor_name [String] Vendor name to remove from filename
  # @return [void]
  # @note Process flow:
  #   1. Validates filename starts with vendor prefix
  #   2. Removes vendor prefix to get product number
  #   3. Generates MD5 hash initials from file content
  #   4. Checks for duplicates and handles accordingly
  #   5. Renames file with new format
  # @example
  #   rename_file_remove_vendor_prefix("/app/merck/merck_productNumber.pdf", "merck")
  #   # Result: /app/merck/productNumber_web_a1b2c3d4e5f6.pdf
  def rename_file_remove_vendor_prefix(file_path, vendor_name)
    filename = File.basename(file_path, '.pdf')

    # Check if filename starts with vendor name (case insensitive)
    return unless filename.downcase.start_with?(vendor_name.downcase)

    # Remove vendor prefix and underscore
    vendor_prefix = "#{vendor_name}_"
    return unless filename.downcase.start_with?(vendor_prefix.downcase)

    new_filename = filename[vendor_prefix.length..].strip

    # Skip if new filename would be empty
    if new_filename.empty?
      Rails.logger.warn "Skipping #{filename}.pdf - would result in empty filename"
      @stats[:skipped_files] += 1
      return
    end

    # Generate file hash to get initials (first 16 characters)
    hash_initials = Chemotion::GenerateFileHashUtils.generate_file_hash_initials(file_path, filename)

    # Add signature web (for saving through vendor API) and initials to filename: productNumber_web_initials.pdf
    final_filename = "#{new_filename}_web_#{hash_initials}"
    new_file_path = File.join(File.dirname(file_path), "#{final_filename}.pdf")

    # Check for duplicates and handle accordingly
    return if duplicate_file?(file_path, new_file_path, final_filename)

    # Rename the file
    FileUtils.mv(file_path, new_file_path)
    Rails.logger.info "Renamed: #{filename}.pdf → #{final_filename}.pdf"
    @stats[:renamed_files] += 1
  end

  # Check for duplicate files and handle appropriately
  #
  # Compares file content using MD5 hashes to detect true duplicates versus
  # files with same product number but different content.
  #
  # @param source_file_path [String] Path to source file being processed
  # @param target_file_path [String] Path where file would be moved
  # @param final_filename [String] Base filename without extension
  # @return [Boolean] true if file was handled (duplicate found), false if no duplicate
  # @note Handling logic:
  #   - Identical content: Remove source file, increment duplicates_removed
  #   - Different content: Create versioned file, increment versions_created
  #   - Hash generation failure: Skip file, increment skipped_files
  def duplicate_file?(source_file_path, target_file_path, final_filename)
    # Check if target file already exists
    return false unless File.exist?(target_file_path)

    # Files exist at same path, compare their content hashes
    source_hash = Chemotion::GenerateFileHashUtils.generate_full_hash(source_file_path)
    target_hash = Chemotion::GenerateFileHashUtils.generate_full_hash(target_file_path)

    if source_hash.nil? || target_hash.nil?
      Rails.logger.error "Could not generate hash for comparison - skipping #{final_filename}.pdf"
      @stats[:skipped_files] += 1
      return true
    end

    if source_hash == target_hash
      # Files are identical - skip and remove source
      Rails.logger.info "Identical file already exists: #{final_filename}.pdf - removing duplicate"
      File.delete(source_file_path)
      @stats[:duplicates_removed] += 1
    else
      # Files are different despite same product number - create with version suffix
      create_versioned_file(source_file_path, target_file_path, final_filename, source_hash)
    end
    true
  end

  # Create versioned filename for files with same product but different content
  #
  # When files have the same product number but different content, creates
  # versioned filenames (e.g., product_hash_v1.pdf, product_hash_v2.pdf).
  # Increments version number until finding an available filename or detecting identical content.
  #
  # @param source_file_path [String] Path to source file that needs versioning
  # @param target_template_path [String] Template path for generating versioned filenames
  # @param base_filename [String] Base filename without extension or version suffix
  # @param source_hash [String] MD5 hash of source file content for duplicate detection
  # @return [void]
  # @note The loop is necessary to find the next available version number:
  #   - Tries v1, v2, v3... until finding free slot
  #   - At each version, checks if existing file has identical content
  #   - Maximum 100 versions to prevent infinite loops
  # @example
  #   create_versioned_file("/app/merck_prod.pdf", "/app/merck/prod_abc123.pdf", "prod_abc123", "hash...")
  #   # Creates: /app/merck/prod_abc123_v1.pdf (or higher version if v1 exists)
  def create_versioned_file(source_file_path, target_template_path, base_filename, source_hash)
    version = 1

    loop do
      versioned_filename = "#{base_filename}_v#{version}"
      versioned_path = File.join(File.dirname(target_template_path), "#{versioned_filename}.pdf")

      unless File.exist?(versioned_path)
        # Found free version slot - create the file
        FileUtils.mv(source_file_path, versioned_path)
        Rails.logger.info "Created versioned file: #{base_filename}.pdf → #{versioned_filename}.pdf"
        @stats[:versions_created] += 1
        break
      end

      # Version exists - check if it's identical content
      existing_hash = Chemotion::GenerateFileHashUtils.generate_full_hash(versioned_path)
      if existing_hash == source_hash
        # Found identical file - remove source as duplicate
        Rails.logger.info "Identical versioned file exists: #{versioned_filename}.pdf - removing duplicate"
        File.delete(source_file_path)
        @stats[:duplicates_removed] += 1
        break
      end

      # Try next version number
      version += 1

      # Safety check to prevent infinite loop
      next unless version > 100

      Rails.logger.error "Too many versions for #{base_filename}.pdf - skipping"
      @stats[:skipped_files] += 1
      break
    end
  end

  # Generate and display comprehensive reorganization summary
  #
  # Outputs detailed statistics about the reorganization process including
  # files processed, operations performed, errors encountered, and final
  # directory structure.
  #
  # @return [void]
  # @note Includes:
  #   - Numerical statistics (files moved, renamed, skipped, etc.)
  #   - Error details if any occurred
  #   - Visual directory structure with file counts
  def print_summary
    Rails.logger.info "\n#{'=' * 50}"
    Rails.logger.info 'REORGANIZATION SUMMARY'
    Rails.logger.info "#{'=' * 50}"
    Rails.logger.info "Total files found: #{@stats[:total_files]}"
    Rails.logger.info "Files moved: #{@stats[:moved_files]}"
    Rails.logger.info "Files renamed: #{@stats[:renamed_files]}"
    Rails.logger.info "Files skipped: #{@stats[:skipped_files]}"
    Rails.logger.info "Duplicates removed: #{@stats[:duplicates_removed]}"
    Rails.logger.info "Versions created: #{@stats[:versions_created]}"
    Rails.logger.info "Errors: #{@stats[:errors].length}"

    if @stats[:errors].any?
      Rails.logger.error "\nERRORS:"
      @stats[:errors].each { |error| Rails.logger.error "  - #{error}" }
    end

    # Show directory structure
    Rails.logger.info "\nNEW DIRECTORY STRUCTURE:"
    show_directory_structure
  end

  # Display visual representation of reorganized directory structure
  #
  # Shows the final directory structure with vendor subdirectories and file counts.
  # Uses emojis for visual clarity (folders 📁, files 📄).
  #
  # @return [void]
  # @example Output:
  #   📁 merck/ (5 files)
  #   📁 sigma/ (3 files)
  #   📄 unorganized_file.pdf
  def show_directory_structure
    return unless Dir.exist?(SAFETY_SHEETS_DIR)

    Dir.entries(SAFETY_SHEETS_DIR).sort.each do |entry|
      next if entry.start_with?('.')

      full_path = File.join(SAFETY_SHEETS_DIR, entry)
      if Dir.exist?(full_path)
        file_count = Dir.glob("#{full_path}/*.pdf").length
        Rails.logger.info "  📁 #{entry}/ (#{file_count} files)"
      else
        Rails.logger.info "  📄 #{entry}"
      end
    end
  end
end

# Interactive script execution when run directly
#
# When this file is executed directly (not required), prompts user for confirmation
# before running the reorganization process. Provides clear information about
# what the script will do and where backups will be created.
#
# @note Only runs when __FILE__ == $PROGRAM_NAME (direct execution)
# @example
#   ruby safety_sheets_reorganizer.rb
#   # Prompts: "Proceed? (y/N): "
if __FILE__ == $PROGRAM_NAME
  Rails.logger.info 'Safety Sheets Folder Reorganizer'
  Rails.logger.info 'This will restructure public/safety_sheets into vendor subdirectories'
  Rails.logger.info 'A backup will be created at public/safety_sheets_backup'

  Rails.logger.info "\nProceed? (y/N): "
  response = gets.chomp.downcase

  result = %w[yes y].include?(response)
  if result
    SafetySheetsReorganizer.reorganize!
  else
    Rails.logger.info 'Operation cancelled.'
  end
end
