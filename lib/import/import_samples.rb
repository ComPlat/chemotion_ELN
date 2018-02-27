require 'roo'
class Import::ImportSamples
  attr_reader :xlsx, :sheet, :header, :mandatory_check, :rows, :unprocessable,
              :processed, :file_path, :collection_id, :current_user_id

  def initialize
    @rows = []
    @unprocessable = []
    @processed = []
  end

  def from_file(file_path, collection_id, current_user_id)
    @file_path = file_path
    @collection_id = collection_id
    @current_user_id = current_user_id
    self
  end

  def process
    begin
      read_file
    rescue
      return error_process_file
    end

    begin
      check_required_fields
    rescue
      return error_required_fields
    end

    begin
      insert_rows
    rescue
      return error_insert_rows
    end

    begin
      write_to_db
      return @unprocessable.empty? ? success : warning
    rescue
      return warning
    end
  end

  private

  def read_file
    @xlsx = Roo::Spreadsheet.open(file_path)
  end

  def check_required_fields
    @sheet = xlsx.sheet(0)
    @header = sheet.row(1)
    @mandatory_check = {}
    ["molfile", "smiles", "cano_smiles"].each do |check|
      if header.find { |e| /^\s*#{check}?/i =~ e } != nil
        @mandatory_check[check] = true
      end
    end
    if mandatory_check.length == 0
      raise "Column headers should have: molfile, or Smiles (or cano_smiles)"
    end
  end

  def insert_rows
    (2..xlsx.last_row).each do |i|
      row = Hash[[header, xlsx.row(i)].transpose]
      next unless has_structure(row)
      rows << row.each_pair{|k,v| v && row[k] = v.to_s }
    end
  end

  def write_to_db
    unprocessable_count = 0
    ActiveRecord::Base.transaction do
      rows.map.with_index do |row, i|
        begin
          # If molfile and smiles (Canonical smiles) is both present
          #  Double check the rows
          if has_molfile(row) && has_smiles(row)
            molfile, go_to_next = get_data_from_molfile_and_smiles(row)
            next if go_to_next
          end

          if has_molfile(row)
            molfile, molecule = get_data_from_molfile(row)
          elsif has_smiles(row)
            molfile, molecule, go_to_next = get_data_from_smiles(row)
            next if go_to_next
          end

          if molecule_not_exist(molecule)
            unprocessable_count += 1
            next
          end

          sample_save(row, molfile, molecule)
        rescue
          unprocessable_count += 1
          @unprocessable << { row: row, index: i }
        end
      end
      raise "More than 1 row can not be processed" if unprocessable_count > 0
    end
  end

  def has_structure row
    has_molfile(row) || has_smiles(row)
  end

  def has_molfile(row)
    mandatory_check["molfile"] && row["molfile"].to_s.present?
  end

  def has_smiles(row)
    header = mandatory_check["smiles"] || mandatory_check["cano_smiles"]
    cell = row["smiles"].to_s.present? || row["cano_smiles"].to_s.present?
    header && cell
  end

  def get_data_from_molfile_and_smiles(row)
    molfile = row["molfile"].presence
    if molfile
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
      molfile_smiles = babel_info[:smiles]
      if mandatory_check["smiles"]
        molfile_smiles = Chemotion::OpenBabelService.canon_smiles_to_smiles molfile_smiles
      end
    end
    if molfile_smiles.blank? &&
      (molfile_smiles != row["cano_smiles"] && molfile_smiles != row["smiles"])
      @unprocessable << { row: row, index: i }
      go_to_next = true
    end
    return molfile, go_to_next
  end

  def get_data_from_molfile(row)
    molfile = row["molfile"].to_s
    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
    inchikey = babel_info[:inchikey]
    is_partial = babel_info[:is_partial]
    if inchikey.presence
      if molecule&.inchikey != inchikey || molecule.is_partial != is_partial
        molecule = Molecule.find_or_create_by_molfile(molfile, babel_info)
      end
    end
    return molfile, molecule
  end

  def get_data_from_smiles(row)
    smiles = mandatory_check["smiles"] ? row["smiles"] : Chemotion::OpenBabelService.canon_smiles_to_smiles(row["cano_smiles"])
    inchikey = Chemotion::OpenBabelService.smiles_to_inchikey smiles
    ori_molf = Chemotion::OpenBabelService.smiles_to_molfile smiles
    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(ori_molf)
    molfile_coord = Chemotion::OpenBabelService.add_molfile_coordinate(ori_molf)
    if inchikey.blank?
      @unprocessable << { row: row, index: i }
      go_to_next = true
    else
      molecule = Molecule.find_or_create_by(inchikey: inchikey, is_partial: false) do |molecule|
        pubchem_info =
          Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)
        molecule.molfile = molfile_coord
        molecule.assign_molecule_data babel_info, pubchem_info
      end
    end
    return molfile_coord, molecule, go_to_next
  end

  def molecule_not_exist(molecule)
    @unprocessable << { row: row, index: i } if molecule.nil?
    molecule.nil?
  end

  def sample_save(row, molfile, molecule)
    sample = Sample.new(created_by: current_user_id)
    sample.molfile = molfile
    sample.molecule = molecule
    # Populate new sample
    header.each_with_index do |field, index|
      next unless included_fields.include?(field)
      sample[field] = row[field]
    end
    sample.collections << Collection.find(collection_id)
    sample.collections << Collection.get_all_collection_for_user(current_user_id)
    sample.save!
    processed.push(sample)
  end

  def excluded_fields
    [
      'id',
      # 'name',
      # 'target_amount_value',
      # 'target_amount_unit',
      'created_at',
      'updated_at',
      # 'description',
      'molecule_id',
      'molfile',
      # 'purity',
      # 'solvent',
      'impurities',
      # 'location',
      'is_top_secret',
      'ancestry',
      # 'external_label',
      'created_by',
      'short_label',
      # 'real_amount_value',
      # 'real_amount_unit',
      # 'imported_readout',
      'deleted_at',
      'sample_svg_file',
      'user_id',
      'identifier',
      # 'density',
      # 'melting_point',
      # 'boiling_point',
      'fingerprint_id',
      'xref',
      # 'molarity_value',
      # 'molarity_unit',
      'molecule_name_id',
    ]
  end

  def included_fields
    Sample.attribute_names - excluded_fields
  end

  def error_process_file
    { status: "invalid",
      message: "Can not process this type of file.",
      data: [] }
  end

  def error_required_fields
    { status: "invalid",
      message: "Column headers should have: molfile or Canonical Smiles.",
      data: [] }
  end

  def error_insert_rows
    { status: "invalid",
      message: "Error while parsing the file.",
      data: [] }
  end

  def warning
    { status: "warning",
      message: "No data saved, because following rows cannot be processed: #{unprocessable_rows}.",
      data: unprocessable }
  end

  def unprocessable_rows
    unprocessable.map { |u| u[:index] + 2 }.join(', ')
  end

  def success
    { status: "ok",
      message: "",
      data: processed }
  end
end
