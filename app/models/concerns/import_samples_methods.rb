# frozen_string_literal: true

module ImportSamplesMethods
  def get_data_from_molfile_and_smiles(row)
    molfile = row['molfile'].presence
    if molfile
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
      molfile_smiles = babel_info[:smiles]
      molfile_smiles = Chemotion::OpenBabelService.canon_smiles_to_smiles molfile_smiles if mandatory_check['smiles']
    end
    if molfile_smiles.blank? && (molfile_smiles != row['cano_smiles'] &&
       molfile_smiles != row['smiles'] && molfile_smiles != row['canonical smiles'])
      @unprocessable << { row: row, index: i }
      go_to_next = true
    end
    [molfile, go_to_next]
  end

  def get_data_from_molfile(row)
    molfile = row['molfile'].to_s
    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
    inchikey = babel_info[:inchikey]
    molecule = Molecule.find_or_create_by_molfile(molfile, babel_info) if inchikey.presence
    [molfile, molecule]
  end

  def assign_molecule_data(molfile_coord, babel_info, inchikey, row)
    if inchikey.blank?
      @unprocessable << { row: row, index: i }
      go_to_next = true
    else
      molecule = Molecule.find_or_create_by(inchikey: inchikey, is_partial: false) do |molecul|
        pubchem_info =
          Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)
        molecul.molfile = molfile_coord
        molecul.assign_molecule_data babel_info, pubchem_info
      end
    end
    [molfile_coord, molecule, go_to_next]
  end

  def get_data_from_smiles(row)
    smiles = (mandatory_check['smiles'] && row['smiles'].presence) ||
             (mandatory_check['cano_smiles'] && row['cano_smiles'].presence) ||
             (mandatory_check['canonical smiles'] && row['canonical smiles'].presence)
    inchikey = Chemotion::OpenBabelService.smiles_to_inchikey smiles
    ori_molf = Chemotion::OpenBabelService.smiles_to_molfile smiles
    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(ori_molf)
    molfile_coord = Chemotion::OpenBabelService.add_molfile_coordinate(ori_molf)
    assign_molecule_data(molfile_coord, babel_info, inchikey, row)
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
      message: "following rows in file: #{File.basename(@file_path).split('-').last} " \
               "could not be imported: #{unprocessable_rows}.",
      unprocessed_data: unprocessable,
      data: processed }
  end

  def no_success(error)
    { status: 'invalid',
      error: error,
      message: "No samples could be imported for file #{File.basename(@file_path).split('-').last} " \
               "because of the following error #{error}.",
      unprocessed_data: unprocessable }
  end

  def unprocessable_rows
    unprocessable.map { |u| u[:index] + 2 }.join(', ')
  end

  def success
    { status: 'ok',
      message: "samples in file: #{File.basename(@file_path).split('-').last} have been imported successfully",
      data: processed }
  end
end
