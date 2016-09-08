require 'roo'
class Import::ImportSamples

  def self.import_samples_from_file(file_path, collection_id, current_user_id)
    @@excluded_field = ["ancestry", "short_label", "external_label"]

    begin
      xlsx = Roo::Spreadsheet.open(file_path)
    rescue
      return {status: "invalid", message: "Can not process this type of file", data: []}
    end
    begin
      rows = xlsx.parse(molfile: /^\s*molfile?/i, cano_smiles: /^\s*cano_smiles?/i)
    rescue
      return {status: "invalid",
              message: "Column headers should have: molfile, and Canonical Smiles",
              data: []}
    end
    #desc: openebabel checks if valid smiles are present
    sheet = xlsx.sheet(0)
    header = sheet.row(1)
    rows.shift
    p rows
    unprocessable = rows.select.with_index do |row, i|
      molfile = Molecule.skip_residues row[:molfile].to_s
      rows[i][:molecule_molfile] = molfile
      cano_smiles = Chemotion::OpenBabelService.get_smiles_from_molfile molfile
      cano_smiles.blank? && canon_smiles == row[:cano_smiles]
    end

    if !unprocessable.empty?
      message = unprocessable.map{|e| "at line #{e[:id]}:#{e[:name]} "} .join("\n")
      {status: "failed", data: unprocessable, message: message}
    else
      processed =[]
      all_collection = Collection.get_all_collection_for_user(current_user_id)
      begin
      ActiveRecord::Base.transaction do
        processed = rows.map.with_index do |row, i|
          molfile = row[:molecule_molfile]
          molecule = Molecule.find_or_create_by_molfile(molfile)
          if molecule.nil?
            processed = [row]
            raise "Import of Sample #{row[:name]}: Molecule is nil."
          end

          data_row = sheet.row(i)
          sample = Sample.new(created_by: current_user_id)
          # Populate new sample
          sample_attr = Sample.attribute_names
          header.each_with_index { |field, index|
            next if @@excluded_field.include?(field)
            next unless sample_attr.include?(field)
            field_assign = field + "="
            sample.send(field_assign, sheet.row(i + 2)[index])
          }
          sample.collections << Collection.find(collection_id)
          sample.collections << all_collection
          sample.save!
        end
      end
      {status: "ok", data: processed, message: ""}
      rescue
      {status: "error", data: processed, message: processed.map{|e| "at line #{e[:id]}:#{e[:name]} "}.join("\n")}
      end

    end
  end

end
