module Chemotion::OpenBabelService

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

  def self.molecule_info_from_molfile molfile
    c = OpenBabel::OBConversion.new
    c.set_in_format 'mol'

    m = OpenBabel::OBMol.new
    c.read_string m, molfile

    c.set_out_format 'smi'
    smiles = c.write_string(m, false).to_s.gsub(/\n/, "").strip

    c.set_out_format 'can'
    ca_smiles = c.write_string(m, false).to_s.gsub(/\n/, "").strip

    c.set_out_format 'inchi'
    inchi = c.write_string(m, false).to_s.gsub(/\n/, "").strip

    c.set_out_format 'inchikey'
    inchikey = c.write_string(m, false).to_s.gsub(/\n/, "").strip

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
      svg: svg_from_molfile(molfile),
      cano_smiles: ca_smiles,
      fp: fingerprint_from_molfile(molfile)
    }

  end

  def self.smiles_to_canon_smiles smiles
    c = OpenBabel::OBConversion.new
    c.set_in_format 'smi'
    c.set_out_format 'can'
    m = OpenBabel::OBMol.new
    c.read_string m, smiles.to_s
    smiles = c.write_string(m, false).to_s.gsub(/\n/, "").strip
  end

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
    fp_16[0]  = ((fp[31] & 0xffffffffffffffff) << 32) + fp[30]
    fp_16[1]  = ((fp[29] & 0xffffffffffffffff) << 32) + fp[28]
    fp_16[2]  = ((fp[27] & 0xffffffffffffffff) << 32) + fp[26]
    fp_16[3]  = ((fp[25] & 0xffffffffffffffff) << 32) + fp[24]
    fp_16[4]  = ((fp[23] & 0xffffffffffffffff) << 32) + fp[22]
    fp_16[5]  = ((fp[21] & 0xffffffffffffffff) << 32) + fp[20]
    fp_16[6]  = ((fp[19] & 0xffffffffffffffff) << 32) + fp[18]
    fp_16[7]  = ((fp[17] & 0xffffffffffffffff) << 32) + fp[16]
    fp_16[8]  = ((fp[15] & 0xffffffffffffffff) << 32) + fp[14]
    fp_16[9]  = ((fp[13] & 0xffffffffffffffff) << 32) + fp[12]
    fp_16[10] = ((fp[11] & 0xffffffffffffffff) << 32) + fp[10]
    fp_16[11] = ((fp[9]  & 0xffffffffffffffff) << 32) + fp[8]
    fp_16[12] = ((fp[7]  & 0xffffffffffffffff) << 32) + fp[6]
    fp_16[13] = ((fp[5]  & 0xffffffffffffffff) << 32) + fp[4]
    fp_16[14] = ((fp[3]  & 0xffffffffffffffff) << 32) + fp[2]
    fp_16[15] = ((fp[1]  & 0xffffffffffffffff) << 32) + fp[0]

    return fp_16

  end

end
