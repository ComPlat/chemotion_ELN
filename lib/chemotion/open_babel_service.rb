require Rails.root.join('lib/chemotion/forked_timeout')

module Chemotion::OpenBabelService
  # Wall-clock bound for svg_from_molfile: some organometallic molfiles make OpenBabel's
  # native SVG writer hang indefinitely (confirmed reproducer: CCDC record EKOWOR, a
  # 193-atom/648-bond uranium complex). Env-overridable so it can be retuned without a deploy.
  #
  # 5s rather than the original 20s. What a caller gets from a hang is nil either way, so the
  # only question is how long it waits to find out — and the paths still asking for an SVG here
  # are ones where waiting is expensive:
  #
  # * {Chemotion::SvgRenderer.open_babel_service}, the render chain's last resort, reached only
  #   when Indigo and Ketcher have both already failed. A request is blocked for the duration.
  # * ChemSpectra and the molecule endpoints, which render for a waiting user.
  #
  # The importers no longer reach it at all — they pass render_svg: false, since
  # {Molecule.svg_reprocess} discards this SVG unconditionally.
  #
  # The cost is real, not a free win: a structure whose render legitimately takes 5-20s now
  # returns nil instead. Measured on 110 records of an organometallic CCDC file — deliberately
  # the worst case for OpenBabel's writer — 92 renders finished within 5s, 9 timed out at 20s
  # anyway, and 9 (8%) landed in the 5-20s band and would now come back empty. On ordinary
  # organic structures that band is far narrower.
  #
  # Those 9 fall back to the rest of the chain, so they only end up with no image at all when
  # Indigo and Ketcher are both unavailable too. Raise the env var if that combination is real
  # for a given deployment.
  SVG_RENDER_TIMEOUT_SECONDS = Integer(ENV.fetch('OPENBABEL_SVG_TIMEOUT_SECONDS', 5))

  # Wall-clock bound for the canonical-SMILES ('can') writer in molecule_info_from_structure.
  # Unlike the SVG writer this one is not merely slow to time out -- on metal clusters its
  # symmetry-detection cost is combinatorial, not size-driven (measured: a 17-atom record took
  # 6s while a 92-atom one took 11.3s), and it runs in-process on every import row with no bound
  # at all before this. Set well above the measured 12.06s worst case (across 6,355 records of a
  # metal-heavy stress file) so it only fires on a genuine outlier/hang, not on ordinary slow
  # structures.
  CANONICAL_SMILES_TIMEOUT_SECONDS = Integer(ENV.fetch('OPENBABEL_CANONICAL_SMILES_TIMEOUT_SECONDS', 20))

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

  def self.inchi_info(molfile)
    extra_inchi = Inchi::ExtraInchiReturnValues.new
    inchi = Inchi.molfileToInchi(molfile, extra_inchi, '-LooseTSACheck -Polymers -FoldCRU -NPZz -SAtZZ -LargeMolecules')
    inchikey = Inchi::InchiToInchiKey(inchi)
    { inchi: inchi, inchikey: inchikey }
  end

  # @param render_svg [Boolean] whether to render the SVG. Pass false when the caller discards it:
  #   it is the single most expensive part of this method — a forked child bounded at
  #   {SVG_RENDER_TIMEOUT_SECONDS}, and the only bounded operation here — and on organometallic
  #   structures roughly one record in ten spends the entire {SVG_RENDER_TIMEOUT_SECONDS} budget
  #   only to be SIGKILLed and return
  #   nil. See {.molecule_info_from_structure} for who should be passing false.
  def self.molecule_info_from_molfile(molfile, render_svg: true)
    molecule_info_from_structure(molfile, 'mol', render_svg: render_svg)
  end

  # @param render_svg [Boolean] when false, +svg:+ comes back nil and no fork is taken.
  #
  #   Defaults to true so no untraced caller changes behaviour, but note that anything feeding
  #   this into {Molecule#assign_molecule_data} should pass false: {Molecule.svg_reprocess} tests
  #   the result with {Molecule.svg_valid_and_not_openbabel?}, OpenBabel's SVG always contains the
  #   literal +Open Babel+, so it is *unconditionally* discarded and re-rendered through
  #   {Chemotion::SvgRenderer}. Rendering it there is dead work, timeout or not.
  #
  #   The renderer chain is unaffected — {Chemotion::SvgRenderer.open_babel_service} calls
  #   {.svg_from_molfile} directly as its last resort, independently of this method.
  def self.molecule_info_from_structure(structure, format = 'mol', render_svg: true)
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
    OpenBabel.obErrorLog.clear_log

    c = OpenBabel::OBConversion.new
    c.set_in_format format

    m = OpenBabel::OBMol.new
    c.read_string m, mf || structure

    c.set_out_format 'smi'
    smiles = c.write_string(m, false).to_s.gsub(/\s.*/m, "").strip

    ca_smiles = canonical_smiles_from_source(mf || structure, format)

    unless format == 'mol'
      c.set_out_format 'mol'
      # opts = OpenBabel::OBConversion::GENOPTIONS
      # c.add_option('gen2D', opts)
      pop = OpenBabel::OBOp.find_type("gen2D")
      pop.do(m) if %w(can smi).include?(format)
      molfile = c.write_string(m, false).to_s
      version = 'V2000'
    end

    inchi_info = inchi_info(mf || molfile)
    if inchi_info[:inchi].blank?
      c.set_out_format 'inchi'
      inchi = c.write_string(m, false).to_s.gsub(/\n/, '').strip
      c.set_out_format 'inchikey'
      inchikey = c.write_string(m, false).to_s.gsub(/\n/, '').strip
    else
      inchi = inchi_info[:inchi]
      inchikey = inchi_info[:inchikey]
    end

    svg = render_svg ? svg_from_molfile(mf || molfile) : nil
    fp = fingerprint_from_molfile(mf || molfile)
    # Snapshot both log levels together, after every in-process OpenBabel call above, so
    # ob_log[:error] and ob_log[:warning] stay mutually consistent (fingerprint can log too).
    # NB: svg_from_molfile runs in a forked child, so its own obErrorLog never reaches here.
    ob_errors = OpenBabel.obErrorLog.get_messages_of_level(0)
    warnings = OpenBabel.obErrorLog.get_messages_of_level(1)
    warnings += svg_timeout_warnings(render_svg, svg)

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
      svg: svg,
      cano_smiles: ca_smiles,
      fp: fp,
      molfile_version: version,
      is_partial: is_partial,
      # TODO we could return 'molfile' in any case
      # molfile: (format != 'mol' && molfile) || (is_partial && molfile)
      molfile: molfile,
      ob_log: {
        error: ob_errors,
        warning: warnings
      }
    }

  end

  def self.inchikey_from_molfile(molfile)
    inchi_info = inchi_info(molfile)
    inchi_info[:inchikey]
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

  # A nil svg means two different things and only one of them is a fault: the render was asked
  # for and timed out, or it was never asked for. Reporting the second as a timeout would put a
  # false warning in the ob_log of every importer that opts out.
  #
  # @return [Array<String>] the timeout warning, or empty
  def self.svg_timeout_warnings(render_svg, svg)
    return [] unless render_svg && svg.nil?

    ["SVG rendering timed out after #{SVG_RENDER_TIMEOUT_SECONDS}s"]
  end

  # @param render_svg [Boolean] forwarded per record — see {.molecule_info_from_structure}
  def self.molecule_info_from_molfiles(molfile_array, render_svg: true)
    molfile_array.map do |molfile|
      molecule_info_from_molfile(molfile, render_svg: render_svg)
    rescue StandardError => e
      Rails.logger.error("Chemotion::OpenBabelService.molecule_info_from_molfiles: failed for one record: #{e.message}")
      nil
    end
  end

  def self.smiles_to_canon_smiles(smiles)
    c = OpenBabel::OBConversion.new
    c.set_in_format 'smi'
    c.set_out_format 'can'
    m = OpenBabel::OBMol.new
    c.read_string m, smiles.to_s
    smiles = c.write_string(m, false).to_s.gsub(/\n/, "").strip
  end

  def self.canon_smiles_to_smiles(can_smiles)
    c = OpenBabel::OBConversion.new
    c.set_in_format 'can'
    c.set_out_format 'smi'
    m = OpenBabel::OBMol.new
    c.read_string m, can_smiles.to_s
    smiles = c.write_string(m, false).to_s.gsub(/\n/, "").strip
  end

  def self.smiles_to_inchikey(smiles)
    result = smiles_to_molfile(smiles)
    inchikey_from_molfile(result)
  end

  def self.smiles_to_molfile(smi)
    c = OpenBabel::OBConversion.new
    c.set_in_format 'smi'

    m = OpenBabel::OBMol.new
    c.read_string m, smi

    c.set_out_format 'mol'

    # Same guard as molfile_from_cano_smiles and add_molfile_coordinate.
    gen_2d = OpenBabel::OBOp.find_type('gen2D')
    gen_2d&.do(m)

    c.write_string(m, false).to_s.rstrip
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

  # clear type 9 bonds from molfile; return false if no type 9 bonds found
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

  def self.molfile_clear_hydrogens molfile, options={}
    cc = OpenBabel::OBConversion.new
    cc.set_in_format 'mol'
    cc.set_out_format 'mol'
    cc.set_options 'd u', OpenBabel::OBConversion::OUTOPTIONS
    mm = OpenBabel::OBMol.new
    cc.read_string mm, molfile
    mm.delete_hydrogens
    cc.write_string(mm, false)

  end

  # Process-isolated, timeout-bounded wrapper around svg_from_molfile_unsafe. Some
  # organometallic molfiles make OpenBabel's native SVG writer hang indefinitely; Ruby's
  # Timeout.timeout cannot interrupt a blocking native call that doesn't yield back to the
  # VM, so this uses fork+SIGKILL isolation instead (Chemotion::ForkedTimeout). Returns nil
  # on timeout rather than raising, so existing callers that already treat a blank/failed
  # SVG as "fall back to a placeholder" (Molecule.svg_reprocess, SvgRenderer) keep working
  # unchanged.
  def self.svg_from_molfile(molfile, options = {})
    Chemotion::ForkedTimeout.run(SVG_RENDER_TIMEOUT_SECONDS) { svg_from_molfile_unsafe(molfile, options) }
  rescue Chemotion::ForkedTimeout::TimedOut => e
    # ForkedTimeout raises TimedOut both on a genuine deadline overrun and when the child
    # crashed / produced no output; e.message distinguishes the two.
    Rails.logger.error("Chemotion::OpenBabelService.svg_from_molfile aborted: #{e.message}")
    nil
  end

  # Process-isolated, timeout-bounded wrapper around OpenBabel's canonical-SMILES writer. See
  # CANONICAL_SMILES_TIMEOUT_SECONDS. Falls back to '' on timeout or any other failure, matching
  # the blank-on-failure contract molecule_info_from_structure's callers already expect from this
  # field.
  def self.canonical_smiles_from_source(source, in_format)
    Chemotion::ForkedTimeout.run(CANONICAL_SMILES_TIMEOUT_SECONDS) do
      canonical_smiles_from_source_unsafe(source, in_format)
    end
  rescue StandardError => e
    # Covers both Chemotion::ForkedTimeout::TimedOut (deadline overrun or a crashed child, e.g.
    # from SystemStackError, which the child's own StandardError rescue does not catch) and any
    # error the writer itself raised and the child re-raised in this process.
    Rails.logger.error("Chemotion::OpenBabelService.canonical_smiles_from_source failed: #{e.message}")
    ''
  end

  def self.canonical_smiles_from_source_unsafe(source, in_format)
    c = OpenBabel::OBConversion.new
    c.set_in_format in_format
    m = OpenBabel::OBMol.new
    c.read_string m, source

    c.set_out_format 'can'
    c.write_string(m, false).to_s.lines.first.to_s.gsub(/\s.*/m, '').strip
  end

  # The bare `private` above this section does not apply to singleton methods, so these two are
  # closed off explicitly.
  private_class_method :canonical_smiles_from_source, :canonical_smiles_from_source_unsafe

  def self.svg_from_molfile_unsafe(molfile, options = {})
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

  def self.get_cdxml_from_molfile(molfile, shifter={}, output_path=nil)
    # clear type 9 bonds for openbabel conv
    mf = mofile_clear_coord_bonds(molfile)
    mol = mf || molfile
    # `obabel -imol #{file_name} -ocdxml`
    # Keep Tempfile references alive until after File.read; GC finalizers delete the files.
    input_tf = Tempfile.new(["input", ".mol"])
    output_tf = output_path ? nil : Tempfile.new(["output", ".mol"])
    input = input_tf.path
    output = output_path || output_tf.path
    File.write(input, mol)

    c = OpenBabel::OBConversion.new
    c.set_in_and_out_formats("mol", "cdxml")
    c.open_in_and_out_files(input, output)
    c.convert

    orig_cdxml = File.read(output)
    shifted_cdxml, geometry = Cdxml::Shifter.new({orig_cdxml: orig_cdxml, shifter: shifter}).convey
    { content: shifted_cdxml, geometry: geometry, path: output_path }
  ensure
    input_tf&.close!
    output_tf&.close!
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
