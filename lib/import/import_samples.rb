require 'roo'
class Import::ImportSamples

  def self.import_samples_from_file(file_path, collection_id, current_user_id)
    @@excluded_field = ["ancestry", "short_label"]

    begin
      xlsx = Roo::Spreadsheet.open(file_path)
    rescue
      return {status: "invalid", message: "Can not process this type of file", data: []}
    end
    begin
      sheet = xlsx.sheet(0)
      header = sheet.row(1)
      mandatory_check = {}
      ["molfile", "smiles", "cano_smiles"].each do |check|
        if header.find { |e| /^\s*#{check}?/i =~ e } != nil
          mandatory_check[check] = true
        end
      end
      if mandatory_check.length == 0
        raise "Column headers should have: molfile, or Smiles (Canonical smiles)"
      end
    rescue
      return {status: "invalid",
              message: "Column headers should have: molfile, and Canonical Smiles",
              data: []}
    end

    begin
      rows = []
      (2..xlsx.last_row).each do |i|
        next unless xlsx.row(i)[0]
        row = Hash[[header, xlsx.row(i)].transpose]
        row.each_key{|x| row[x] = row[x].to_s if row[x]}
        rows << row
      end
    rescue
      return {status: "invalid",
              message: "Error while parsing file",
              data: []}
    end

    unprocessable =[]
    processed = []
    begin
      ActiveRecord::Base.transaction do
        rows.map.with_index do |row, i|
          # If molfile and smiles (Canonical smiles) is both present
          #  Double check the rows
          if mandatory_check["molfile"] && (mandatory_check["smiles"] || mandatory_check["cano_smiles"])
            molfile = Molecule.skip_residues row["molfile"].to_s
            molfile_smiles = Chemotion::OpenBabelService.get_smiles_from_molfile molfile
            if mandatory_check["smiles"]
              molfile_smiles = Chemotion::OpenBabelService.canon_smiles_to_smiles molfile_smiles
            end

            if molfile_smiles.blank? &&
              (molfile_smiles != row["cano_smiles"] && molfile_smiles != row["smiles"])
              unprocessable << row
              next
            end
          end

          if mandatory_check["molfile"]
            molfile = row["molfile"].to_s
            if molfile.include? ' R# '
              molecule = Molecule.find_or_create_by_molfile(molfile.clone, true)
            else
              babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
              inchikey = babel_info[:inchikey]
              unless inchikey.blank?
                unless molecule && molecule.inchikey == inchikey
                  molecule = Molecule.find_or_create_by_molfile(molfile)
                end
              end
            end
          elsif mandatory_check["smiles"] || mandatory_check["cano_smiles"]
            smiles = mandatory_check["smiles"] ? row["molfile"] : Chemotion::OpenBabelService.canon_smiles_to_smiles(row["cano_smiles"])
            inchikey = Chemotion::OpenBabelService.smiles_to_inchikey smiles
            molfile = Chemotion::OpenBabelService.smiles_to_molfile smiles
            babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
            if inchikey.blank?
              unprocessable << row
              next
            else
              molecule = Molecule.find_or_create_by(inchikey: inchikey, is_partial: false) do |molecule|
                pubchem_info =
                  Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)
                molecule.assign_molecule_data babel_info, pubchem_info
              end
            end
          end

          if molecule.nil?
            unprocessable << row
            next
          end

          sample = Sample.new(created_by: current_user_id)
          sample.molfile = molfile
          sample.molecule = molecule
          # Populate new sample
          sample_attr = Sample.attribute_names
          header.each_with_index { |field, index|
            next if @@excluded_field.include?(field)
            next unless sample_attr.include?(field)
            field_assign = field + "="
            sample.send(field_assign, row[field])
          }
          sample.collections << Collection.find(collection_id)
          sample.collections << Collection.get_all_collection_for_user(current_user_id)
          sample.save!
        end
      end

      if !unprocessable.empty?
        {
          status: "warning", data: unprocessable,
          message: "There are some rows cannot be processed"
        }
      else
        {status: "ok", data: processed, message: ""}
      end

    rescue
    {
      status: "error", data: unprocessable,
      message: "error while processing file"
    }
    end
  end
end
