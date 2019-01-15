module Chemotion::OpenBabelService

  # mdl V3000
  MOLFILE_COUNT_LINE_START      = 'M  V30 COUNTS '
  MOLFILE_BEGIN_CTAB_BLOCK_LINE = 'M  V30 BEGIN CTAB'
  MOLFILE_BEGIN_ATOM_BLOCK_LINE = 'M  V30 BEGIN ATOM'
  MOLFILE_END_ATOM_BLOCK_LINE   = 'M  V30 END ATOM'
  MOLFILE_BEGIN_BOND_BLOCK_LINE = 'M  V30 BEGIN BOND'
  MOLFILE_END_BOND_BLOCK_LINE   = 'M  V30 END BOND'
  MOLFILE_END_CTAB_BLOCK_LINE   = 'M  V30 END CTAB'

  # mdl V(2|3)000
  MOLFILE_BLOCK_END_LINE = 'M  END'

  def self.samplemolfile

    <<-MOLFILE

TheRing 0   0.00000     0.00000     0
[Insert Comment Here]
10 11  0  0  0  0  0  0  0  0  1 V2000
 -0.4330    0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  0.4330   -0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  0.4330   -1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
 -0.4330   -1.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
 -1.2990   -1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
 -1.2990   -0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
 -0.4330    1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  0.4330    1.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1.2990    1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1.2990    0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
1  2  1  0  0  0  0
2  3  1  0  0  0  0
3  4  1  0  0  0  0
4  5  1  0  0  0  0
5  6  1  0  0  0  0
6  1  1  0  0  0  0
1  7  1  0  0  0  0
7  8  1  0  0  0  0
8  9  1  0  0  0  0
9 10  1  0  0  0  0
10  2  1  0  0  0  0
M  END
    MOLFILE

  end

  def self.molecule_info_from_molfile(molfile)
    self.molecule_info_from_structure(molfile, 'mol')
  end

  def self.molecule_info_from_structure(structure, format = 'mol')
    is_partial = false
    mf = nil
    if format == 'mol'
      version = molfile_version(structure)
      is_partial = molfile_has_R(structure, version)
      molfile = structure
      molfile = molfile_skip_R(structure, version) if is_partial
      mf = mofile_clear_coord_bonds(molfile, version)
      if mf
        version += ' T9'
      else
        mf = molfile
      end
    end

    c = OpenBabel::OBConversion.new
    c.set_in_format format

    m = OpenBabel::OBMol.new
    c.read_string m, mf || structure

    c.set_out_format 'smi'
    smiles = c.write_string(m, false).to_s.gsub(/\s.*/m, "").strip

    c.set_out_format 'can'
    ca_smiles = c.write_string(m, false).to_s.gsub(/\s.*/m, "").strip

    c.set_out_format 'inchi'
    inchi = c.write_string(m, false).to_s.gsub(/\n/, "").strip

    c.set_out_format 'inchikey'
    inchikey = c.write_string(m, false).to_s.gsub(/\n/, "").strip

    unless format == 'mol'
      c.set_out_format 'mol'
      # opts = OpenBabel::OBConversion::GENOPTIONS
      # c.add_option('gen2D', opts)
      pop = OpenBabel::OBOp.find_type("gen2D")
      pop.do(m) if %w(can smi).include?(format)
      molfile = c.write_string(m, false).to_s
      version = 'V2000'
    end

    {
      charge: m.get_total_charge,
      mol_wt: m.get_mol_wt,
      mass: m.get_exact_mass,
      title_legacy: m.get_title,
      spin: m.get_total_spin_multiplicity,
      smiles: smiles,
      inchikey: inchikey,
      inchi: inchi,
      formula: m.get_formula,
      svg: svg_from_molfile(mf || molfile),
      cano_smiles: ca_smiles,
      fp: fingerprint_from_molfile(mf || molfile),
      molfile_version: version,
      is_partial: is_partial,
      # TODO we could return 'molfile' in any case
      # molfile: (format != 'mol' && molfile) || (is_partial && molfile)
      molfile: molfile
    }

  end

  def self.inchikey_from_molfile molfile
    c = OpenBabel::OBConversion.new
    c.set_in_format 'mol'

    m = OpenBabel::OBMol.new
    c.read_string m, molfile

    c.set_out_format 'inchikey'
    inchikey = c.write_string(m, false).to_s.gsub(/\n/, "").strip

    return inchikey
  end

  def self.molfile_from_cano_smiles(cano_smiles)
    c = OpenBabel::OBConversion.new
    c.set_in_format 'can'

    m = OpenBabel::OBMol.new
    c.read_string m, cano_smiles

    c.set_out_format 'mol'
    pop = OpenBabel::OBOp.find_type('gen2D')
    pop.do(m)
    c.write_string(m, false).to_s
  end

  def self.molecule_info_from_molfiles molfile_array
    molecule_info = []
    molfile_array.each do |molfile|
      begin
        ob_info = self.molecule_info_from_molfile(molfile)
      rescue
        {}
      end
      molecule_info << ob_info
    end
    molecule_info
  end

  def self.smiles_to_canon_smiles smiles
    c = OpenBabel::OBConversion.new
    c.set_in_format 'smi'
    c.set_out_format 'can'
    m = OpenBabel::OBMol.new
    c.read_string m, smiles.to_s
    smiles = c.write_string(m, false).to_s.gsub(/\n/, "").strip
  end

  def self.canon_smiles_to_smiles can_smiles
    c = OpenBabel::OBConversion.new
    c.set_in_format 'can'
    c.set_out_format 'smi'
    m = OpenBabel::OBMol.new
    c.read_string m, can_smiles.to_s
    smiles = c.write_string(m, false).to_s.gsub(/\n/, "").strip
  end

  def self.smiles_to_inchikey smiles
    c = OpenBabel::OBConversion.new
    c.set_in_format 'smi'
    c.set_out_format 'inchikey'
    m = OpenBabel::OBMol.new
    c.read_string m, smiles.to_s
    smiles = c.write_string(m, false).to_s.gsub(/\n/, "").strip
  end

  def self.smiles_to_molfile smi
    c = OpenBabel::OBConversion.new
    c.set_in_format 'smi'

    m = OpenBabel::OBMol.new
    c.read_string m, smi

    c.set_out_format 'mol'
    molfile = c.write_string(m, false).to_s.rstrip
  end

  def self.add_molfile_coordinate(mol_data)
    c = OpenBabel::OBConversion.new
    opts = OpenBabel::OBConversion::GENOPTIONS
    c.add_option 'gen2D', opts
    c.set_in_format 'mol'
    c.set_out_format 'mol'
    m = OpenBabel::OBMol.new
    c.read_string m, mol_data
    m.do_transformations c.get_options(opts), c

    c.write_string(m, false)
  end

  def self.mofile_clear_coord_bonds(molfile, version = nil)
    case version || molfile_version(molfile)
    when 'V2000'
      mofile_2000_clear_coord_bonds(molfile)
    when 'V3000'
      mofile_3000_clear_coord_bonds(molfile)
    else
      false
    end
  end

  def self.mofile_2000_clear_coord_bonds(molfile)
    # clear bond lines with bond type 8(any), 9(coord), or 10(hydrogen)
    # split ctab from properties
    mf = molfile.split(/^(#{MOLFILE_BLOCK_END_LINE}\r?\n)/)
    ctab = mf[0]
    # select lines
    ctab_arr = ctab.lines
    filtered_ctab_arr = ctab_arr.select do |line|
      !line.match(
        /^(  [0-9]| [1-9][0-9]|[1-9][0-9][0-9])(  [0-9]| [1-9][0-9]|[1-9][0-9][0-9])(  [89]| 10)(...)(...)(...)(...)/
      )
    end
    coord_bond_count =  ctab_arr.size - filtered_ctab_arr.size
    return false if coord_bond_count.zero?
    original_count_line = ctab_arr[3]
    original_count_line.match(/^(  [0-9]| [1-9][0-9]|[1-9][0-9][0-9])(  [0-9]| [1-9][0-9]|[1-9][0-9][0-9]).*V2000$/)
    original_bond_count = $2.to_i
    bond_count = original_bond_count - coord_bond_count
    count_line = original_count_line.clone
    count_line[3..5] = bond_count.to_s.rjust(3)
    filtered_ctab_arr[3] = count_line

    # concat to molfile
    (filtered_ctab_arr + mf[1..-1]).join
  end

  def self.mofile_3000_clear_coord_bonds(molfile)
    # clear bond lines with bond type 8(any), 9(coord), or 10(hydrogen)
    # split ctab from properties asumming only 1 CTAB (no RGFile)
    mf = molfile.split(/^(#{MOLFILE_BLOCK_END_LINE}\r?\n)/)
    ctab = mf[0]
    # select lines
    ctab_arr = ctab.lines
    id_count_line = nil
    id_bond_block_start_line = nil
    count_line_a = nil

    filtered_ctab_arr = ctab_arr.select.with_index do |line, i|
      unless id_count_line
        line =~ /(#{MOLFILE_COUNT_LINE_START}\d+ )(\d+)/
        if $&
          count_line_a = [$1, $2.to_i, $']
          id_count_line = i
          ori_bond_count = $2.to_i
        end
      end
      if !id_bond_block_start_line
        line =~ /#{MOLFILE_BEGIN_BOND_BLOCK_LINE}/ && (id_bond_block_start_line = i)
        next true
      end
      if line.match(/^M  V30 \d+ (8|9|10) \d+ \d+/)
        count_line_a[1] -= 1
        next false
      end
      true
    end

    coord_bond_count =  ctab_arr.size - filtered_ctab_arr.size
    return false if !id_count_line
    return nil if coord_bond_count.zero?
    filtered_ctab_arr[id_count_line] = count_line_a.join

    # concat to molfile
    (filtered_ctab_arr + mf[1..-1]).join
  end

  def self.molfile_version(molfile)
    return 'nil' unless molfile.present?
    mf = molfile.lines[0..4]
    return "V#{$1}000" if mf[3]&.strip =~ /V(2|3)000$/
    return "V3000" if mf[4] =~ /^M  V30/
    'unkwn'
  end

  def self.molfile_has_R(molfile, version = nil)
    version = self.molfile_version(molfile) unless version
    case version[0..5]
    when 'V2000'
      molfile_2000_has_R(molfile)
    when  'V3000'
      molfile_3000_has_R(molfile)
    else
      molfile.include? ' R# '
    end
  end

  def self.molfile_2000_has_R(molfile)
    molfile.lines[4..-1].each do |line|
      return true if line =~ /^.{31}R\#/
      return false if line =~ /^#{MOLFILE_BLOCK_END_LINE}/
    end
    false
  end

  def self.molfile_3000_has_R(molfile)
    molfile.lines[4..-1].each do |line|
      return true if line =~ /^M  V30 \d+ R\#/
      return false if line =~ /^#{MOLFILE_END_ATOM_BLOCK_LINE}/
    end
    false
  end

  def self.molfile_skip_R(molfile, version = nil)
    version = self.molfile_version(molfile) unless version
    case version[0..5]
    when 'V2000'
      molfile_2000_skip_R(molfile)
    when  'V3000'
      molfile_3000_skip_R(molfile)
    else
      begin
        molfile_2000_skip_R(molfile)
      rescue
        false
      end
    end
  end

  # skip residues in molfile and replace with Carbon
  # TODO should be replaced with Hydrogens or removed
  def self.molfile_2000_skip_R(molfile)
    lines = molfile.lines
    lines.size > 3 && lines[4..-1].each.with_index do |line, i|
      break if line =~ /^#{MOLFILE_BLOCK_END_LINE}/
      # replace residues with Carbons
      lines[i+4] = "#{$1}C #{$'}" if line =~/^(.{31})R\#/
      # delete R group info line
      lines[i+4] = nil if line =~ /^M\s+RGP[\d ]+/
    end
    lines.join
  end

  def self.molfile_3000_skip_R(molfile)
    lines = molfile.lines
    lines.size > 3 && lines[4..-1].each.with_index do |line, i|
      break if line =~ /^#{MOLFILE_END_ATOM_BLOCK_LINE}/
      # lines[i+4] = "#{$1}C #{$'}" if line =~/^(M  V30 \d+ )R# /
      # replace residues with Carbons, delete R group info
      lines[i+4] = "#{$1}C#{$2}#{$3}#{$'}" if line =~/^(M  V30 \d+ )R#(.*)RGROUPS\=\([\d ]*\)(.*)/
    end
    lines.join
  end


  # TODO fix option settings
  # def self.convert_3000_to_2000(molfile)
  #   c = OpenBabel::OBConversion.new
  #   c.set_in_format 'mol'
  #
  #   m = OpenBabel::OBMol.new
  #   c.read_string m, mol
  #   opts = OpenBabel::OBConversion::GENOPTIONS
  #   c.set_options '3', OpenBabel::OBConversion::OUTOPTIONS
  #   c.add_option 'gen2D', opts
  #   c.set_out_format 'mol'
  #   molfile = c.write_string(m, false).to_s.rstrip
  # end


  private

  def self.svg_from_molfile molfile, options={}
    c = OpenBabel::OBConversion.new
    c.set_in_format 'mol'
    c.set_out_format 'svg'

    unless options[:highlight].blank?
      c.add_option 's', OpenBabel::OBConversion::GENOPTIONS, "#{options[:highlight]} green"
    end
    c.set_options 'd u', OpenBabel::OBConversion::OUTOPTIONS

    m = OpenBabel::OBMol.new
    c.read_string m, molfile

    #please keep
    #m.do_transformations c.get_options(OpenBabel::OBConversion::GENOPTIONS), c

    c.write_string(m, false)
  end

  # Return an array of 32
  def self.fingerprint_from_molfile molfile
    c = OpenBabel::OBConversion.new
    m = OpenBabel::OBMol.new

    c.set_in_format('mol')
    c.read_string(m, molfile)

    fp = OpenBabel::VectorUnsignedInt.new
    # We will gets default size of fingerprint: 1024 bits
    fprinter = OpenBabel::OBFingerprint.find_fingerprint('FP2')
    fprinter.get_fingerprint(m, fp)

    fp_16 = []
    fp_16[0]  = fp[31] << 32 | fp[30]
    fp_16[1]  = fp[29] << 32 | fp[28]
    fp_16[2]  = fp[27] << 32 | fp[26]
    fp_16[3]  = fp[25] << 32 | fp[24]
    fp_16[4]  = fp[23] << 32 | fp[22]
    fp_16[5]  = fp[21] << 32 | fp[20]
    fp_16[6]  = fp[19] << 32 | fp[18]
    fp_16[7]  = fp[17] << 32 | fp[16]
    fp_16[8]  = fp[15] << 32 | fp[14]
    fp_16[9]  = fp[13] << 32 | fp[12]
    fp_16[10] = fp[11] << 32 | fp[10]
    fp_16[11] = fp[9]  << 32 | fp[8]
    fp_16[12] = fp[7]  << 32 | fp[6]
    fp_16[13] = fp[5]  << 32 | fp[4]
    fp_16[14] = fp[3]  << 32 | fp[2]
    fp_16[15] = fp[1]  << 32 | fp[0]

    fp_16
  end

  def self.bin_fingerprint_from_molfile molfile
    fingerprint_from_molfile(molfile).map {|e| "%064b" % e}
  end

  def self.get_smiles_from_molfile molfile
    c = OpenBabel::OBConversion.new
    m = OpenBabel::OBMol.new
    f = OpenBabel::OBMol.new

    c.set_in_format('mol')
    c.read_string(m, molfile)

    c.set_out_format 'can'
    smi = c.write_string(m, false).to_s.gsub(/\n/, "").strip

    # fragment = OpenBabel::OBBitVec .new
    # fragment_data = OpenBabel::OBPairData.new
    # fragment_data.set_attribute(smi)
    # f.clone_data(fragment_data)
    #
    # c.set_in_and_out_formats("smi", "can")
    # partial_smi = c.write_string(f, true)

    return smi
  end

  def self.substructure_match query, molfile_target
    c = OpenBabel::OBConversion.new
    m = OpenBabel::OBMol.new

    # read molecule
    c.set_in_format('mol')
    c.read_string(m, molfile_target)

    sp = OpenBabel::OBSmartsPattern.new
    sp.init(query)

    return sp.match(m)
  end

  def self.get_cdxml_from_molfile(mol, shifter={}, output_path=nil)
    # `obabel -imol #{file_name} -ocdxml`
    input = Tempfile.new(["input", ".mol"]).path
    output = output_path || Tempfile.new(["output", ".mol"]).path
    File.write(input, mol)

    c = OpenBabel::OBConversion.new
    c.set_in_and_out_formats("mol", "cdxml")
    c.open_in_and_out_files(input, output)
    c.convert

    orig_cdxml = File.read(output)
    shifted_cdxml, geometry = Cdxml::Shifter.new({orig_cdxml: orig_cdxml, shifter: shifter}).convey
    return { content: shifted_cdxml, geometry: geometry, path: output }
  end

  def self.smi_to_svg(smi)
    c = OpenBabel::OBConversion.new
    m = OpenBabel::OBMol.new
    c.set_in_and_out_formats('smi', 'svg')
    c.read_string(m, smi)

    c.write_string(m, true)
  end

  def self.smi_to_trans_svg(smi)
    rect = '<rect x="0" y="0" width="100" '
    rect += 'height="100" fill="white"/>'
    svg = smi_to_svg(smi)
    svg.slice!(rect)
    svg
  end

  def self.mdl_to_svg(mdl)
    c = OpenBabel::OBConversion.new
    m = OpenBabel::OBMol.new
    c.set_in_and_out_formats('mdl', 'svg')
    c.read_string(m, mdl)

    c.write_string(m, true)
  end

  def self.mdl_to_trans_svg(mdl)
    rect = '<rect x="0" y="0" width="100" '
    rect += 'height="100" fill="white"/>'
    svg = mdl_to_svg(mdl)
    svg.slice!(rect)
    svg
  end
end
