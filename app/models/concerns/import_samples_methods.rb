# frozen_string_literal: true

module ImportSamplesMethods
  def has_structure row
    has_molfile(row) || has_smiles(row)
  end

  def has_molfile(row)
    mandatory_check["molfile"] && row["molfile"].to_s.present?
  end

  def has_smiles(row)
    header = mandatory_check["smiles"] || mandatory_check["cano_smiles"] || mandatory_check["canonical smiles"]
    cell = row["smiles"].to_s.present? || row["cano_smiles"].to_s.present? || row["canonical smiles"].to_s.present?
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
      (molfile_smiles != row["cano_smiles"] && molfile_smiles != row["smiles"] && molfile_smiles != row["canonical smiles"])
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
      molecule = Molecule.find_or_create_by_molfile(molfile, babel_info)
    end
    return molfile, molecule
  end

  def get_data_from_smiles(row)
    smiles = (mandatory_check['smiles'] && row['smiles'].presence) ||
        (mandatory_check['cano_smiles'] && row['cano_smiles'].presence) ||
        (mandatory_check['canonical smiles'] && row['canonical smiles'].presence)
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

  # format row[field] for melting and boiling point
  def format_to_interval_syntax(row_field)
    return "[#{-Float::INFINITY}, #{Float::INFINITY}]" if row_field.nil?

    # Regex checks for a range of numbers that are separated by a dash, or a single number
    matches = row_field.scan(/^(-?\d+(?:[.,]\d+)?)(?:\s*-\s*(-?\d+(?:[.,]\d+)?))?$/).flatten.compact
    return "[#{-Float::INFINITY}, #{Float::INFINITY}]" if matches.empty?

    numbers = matches.filter_map(&:to_f)
    lower_bound, upper_bound = numbers.size == 1 ? [numbers[0], Float::INFINITY] : numbers
    "[#{lower_bound}, #{upper_bound}]"
  end

  def sample_save(row, molfile, molecule)
    sample = Sample.new(created_by: current_user_id)
    sample.molfile = molfile
    sample.molecule = molecule
    # Populate new sample
    stereo = {}
    header.each_with_index do |field, index|
      if field.to_s.strip =~ /^stereo_(abs|rel)$/
        stereo[$1] = row[field]
      end
      map_column = ReportHelpers::EXP_MAP_ATTR[:sample].values.find { |e| e[1] == '"' + field + '"' }
      db_column = map_column.nil? ? field : map_column[0].sub('s.', '')
      db_column.delete!('"')
      next unless included_fields.include?(db_column)
      comparison_values = %w[melting_point boiling_point]
      sample[db_column] = comparison_values.include?(db_column) ? format_to_interval_syntax(row[field]) : row[field]
      sample[db_column] = '' if %w[description solvent location external_label].include?(db_column) && row[field].nil?
      sample[db_column] = row[field] == 'Yes' if %w[decoupled].include?(db_column)
    end

    if row['solvent'].is_a? String
      solvent = Chemotion::SampleConst.solvents_smiles_options.find { |s| s[:label].include?(row['solvent']) }
      sample['solvent'] = [{ label: solvent[:value][:external_label], smiles: solvent[:value][:smiles], ratio: '100' }] if solvent.present?
    end

    sample.validate_stereo(stereo)
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

  def error_process_file(error)
    { status: 'invalid',
      message: 'Can not process this type of file.',
      error: error,
      data: [] }
  end

  def error_required_fields(error)
    { status: 'invalid',
      error: error,
      message: 'Column headers should have: molfile or Canonical Smiles.',
      data: [] }
  end

  def error_process(error)
    { status: 'invalid',
      error: error,
      message: 'Error while parsing the file.',
      data: [] }
  end

  def warning(error = nil)
    { status: 'warning',
      error: error,
      message: "following rows could not be imported: #{unprocessable_rows}.",
      unprocessed_data: unprocessable,
      data: processed }
  end

  def no_success(error)
    { status: 'invalid',
      error: error,
      message: "No samples could be imported because of the following error #{error}.",
      unprocessed_data: unprocessable }
  end

  def unprocessable_rows
    unprocessable.map { |u| u[:index] + 2 }.join(', ')
  end

  def success
    { status: 'ok',
      message: 'samples have been imported successfully',
      data: processed }
  end
end
