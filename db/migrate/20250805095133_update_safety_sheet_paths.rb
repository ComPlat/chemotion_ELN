require_relative '../../lib/chemotion/generate_file_hash_utils'
require_relative '../../lib/chemotion/data_extractor'

class UpdateSafetySheetPaths < ActiveRecord::Migration[6.1]
  def up
    # Step 1: Run the safety sheets reorganizer
    reorganize_safety_sheets

    # Step 2: Update chemical_data paths in database
    update_chemical_paths
  end

  def down
    # Rollback is complex due to file reorganization
    # Manual restoration from backup would be required
    raise ActiveRecord::IrreversibleMigration,
          "This migration cannot be automatically rolled back. " \
          "Restore from public/safety_sheets_backup if needed."
  end

  private

  def reorganize_safety_sheets
    Rails.logger.info "Running Safety Sheets Reorganizer..."

    # Load shared utilities and reorganizer
    require_relative '../../lib/chemotion/file_hash_utils'
    require_relative '../../lib/chemotion/safety_sheets_reorganizer'
    SafetySheetsReorganizer.reorganize!

    Rails.logger.info "Safety sheets reorganization complete."
  end

  def update_chemical_paths
    Rails.logger.info "Updating chemical database paths..."

    total_updated = 0
    total_chemicals = Chemical.count

    Chemical.find_each.with_index do |chemical, index|
      if index % 100 == 0
        Rails.logger.info "Processing chemical #{index + 1}/#{total_chemicals}..."
      end

      updated = update_chemical_safety_sheet_paths(chemical)
      total_updated += 1 if updated
    end

    Rails.logger.info "Updated paths in #{total_updated} chemical records."
  end

  def update_chemical_safety_sheet_paths(chemical)
    return false unless chemical.chemical_data.is_a?(Array) && chemical.chemical_data[0]

    chemical_data = chemical.chemical_data[0]
    safety_sheet_paths = chemical_data['safetySheetPath']

    return false unless safety_sheet_paths.is_a?(Array) && safety_sheet_paths.any?

    updated = false
    path_updates = []

    safety_sheet_paths.each do |path_entry|
      path_entry.each do |key, path|
        next unless key.end_with?('_link') && path.is_a?(String)

        new_path = convert_path_to_new_structure(path, key)
        if new_path != path
          path_updates << {
            link_key: key,
            old_path: path,
            new_path: new_path
          }
          path_entry[key] = new_path
          updated = true
        end
      end
    end

    if updated
      chemical.update!(chemical_data: chemical.chemical_data)

      # Log detailed information about each path update
      Rails.logger.info "Updated Chemical ID: #{chemical.id}"
      path_updates.each do |update|
        Rails.logger.info "  #{update[:link_key]}: #{update[:old_path]} → #{update[:new_path]}"
      end

      true
    else
      false
    end
  rescue StandardError => e
    Rails.logger.error "Error updating chemical ID #{chemical.id}: #{e.message}"
    false
  end

  def convert_path_to_new_structure(old_path, link_key)
    # Example: "/safety_sheets/merck_ABC123_v1.pdf"
    # Should become: "/safety_sheets/merck/ABC123_v1_initials.pdf"

    return old_path unless old_path.start_with?('/safety_sheets/')

    # Extract filename from path
    filename = File.basename(old_path, '.pdf')

    # Extract vendor name from link key
    # link_key examples: "merck_link", "merck_v2_link"
    vendor_name = Chemotion::DataExtractor.extract_vendor_from_link_key(link_key)
    return old_path unless vendor_name

    # Check if filename starts with vendor name
    vendor_prefix = "#{vendor_name}_"
    unless filename.downcase.start_with?(vendor_prefix.downcase)
      return old_path
    end

    # Remove vendor prefix from filename
    base_filename = filename[vendor_prefix.length..].strip
    return old_path if base_filename.empty?

    # Generate initials for the file (first 16 chars of hash)
    old_file_path = "public#{old_path}"
    file_initials = Chemotion::GenerateFileHashUtils.generate_file_hash_initials(old_file_path, base_filename)

    # Construct new filename with initials
    new_filename_with_initials = "#{base_filename}_#{file_initials}"

    # Construct new path: /safety_sheets/vendor/filename_initials.pdf
    "/safety_sheets/#{vendor_name}/#{new_filename_with_initials}.pdf"
  end
end
