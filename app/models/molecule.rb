class Molecule < ActiveRecord::Base
  acts_as_paranoid
  include Collectable

  has_many :samples
  has_many :collections, through: :samples
  before_save :sanitize_molfile

  validates_uniqueness_of :inchikey, scope: :is_partial

  NUMBER_OF_FINGERPRINT_COL = 16

  # scope for suggestions
  scope :by_iupac_name, -> (query) {
    where('iupac_name ILIKE ?', "%#{query}%")
  }
  scope :by_sum_formular, -> (query) {
    where('sum_formular ILIKE ?', "%#{query}%")
  }
  scope :by_inchistring, -> (query) {
    where('inchistring ILIKE ?', "%#{query}%")
  }
  scope :by_cano_smiles, -> (query) {
    where('cano_smiles ILIKE ?', "%#{query}%")
  }

  scope :with_reactions, -> {
    sample_ids = ReactionsProductSample.pluck(:sample_id) +
      ReactionsReactantSample.pluck(:sample_id) +
      ReactionsStartingMaterialSample.pluck(:sample_id)
    molecule_ids = Sample.find(sample_ids).flat_map(&:molecule).map(&:id)
    where(id: molecule_ids)
  }
  scope :with_wellplates, -> {
    molecule_ids =
      Wellplate.all.flat_map(&:samples).flat_map(&:molecule).map(&:id)
    where(id: molecule_ids)
  }

  def self.count_bits_set(fp_vector)
    query_num_set_bits = 0

    fp_vector.each do |fp|
      num_bit_on = ("%064b" % fp).count("1")
      query_num_set_bits = query_num_set_bits + num_bit_on
    end

    return query_num_set_bits
  end

  def self.selected
    unscoped.where("deleted_at IS NOT NULL")
  end

  scope :by_tanimoto_coefficient, -> (fp_vector,
                                      threshold = 0.5) {
    query_num_set_bits = self.count_bits_set(fp_vector)

    query = sanitize_sql_for_conditions(
      ["id, num_set_bits,
        fp0 & ? n0, fp1 & ? n1, fp2 & ? n2, fp3 & ? n3, fp4 & ? n4, fp5 & ? n5,
        fp6 & ? n6, fp7 & ? n7, fp8 & ? n8, fp9 & ? n9, fp10 & ? n10,
        fp11 & ? n11, fp12 & ? n12, fp13 & ? n13, fp14 & ? n14, fp15 & ? n15",
        "%064b" % fp_vector[0],
        "%064b" % fp_vector[1],
        "%064b" % fp_vector[2],
        "%064b" % fp_vector[3],
        "%064b" % fp_vector[4],
        "%064b" % fp_vector[5],
        "%064b" % fp_vector[6],
        "%064b" % fp_vector[7],
        "%064b" % fp_vector[8],
        "%064b" % fp_vector[9],
        "%064b" % fp_vector[10],
        "%064b" % fp_vector[11],
        "%064b" % fp_vector[12],
        "%064b" % fp_vector[13],
        "%064b" % fp_vector[14],
        "%064b" % fp_vector[15]
      ])

    new_fp = Molecule.unscoped.select(query)

    NUMBER_OF_FINGERPRINT_COL.times { |i|
      new_fp = new_fp.where("fp#{i}  & ? = ?",
                            "%064b" % fp_vector[i],
                            "%064b" % fp_vector[i])
    }

    common_set_bits = unscoped.from("(#{new_fp.to_sql}) AS new_fp").select("*,
        LENGTH(TRANSLATE(
          CONCAT(new_fp.n0::text, new_fp.n1::text, new_fp.n2::text,
                 new_fp.n3::text, new_fp.n4::text, new_fp.n5::text,
                 new_fp.n6::text, new_fp.n7::text, new_fp.n8::text,
                 new_fp.n9::text, new_fp.n10::text, new_fp.n11::text,
                 new_fp.n12::text, new_fp.n13::text,
                 new_fp.n14::text, new_fp.n15::text),
          '0',
          '')) as common_set_bit")
    query = sanitize_sql_for_conditions(["id,
      (common_set_bit::float8 / (? + num_set_bits - common_set_bit)::float8) AS tanimoto",
      query_num_set_bits])
    tanimoto = unscoped.from("(#{common_set_bits.to_sql}) AS common_bits").select(query).sort_by(&:tanimoto)

    molecule_ids = tanimoto.map(&:id)

    where(id: molecule_ids)
  }

  # Return only molecule with Tanimoto coefficient (T) higher than threshold
  # Default with molecule with T >= 0.6
  scope :by_finger_print, -> (fp_vector, threshold = 0.6) {
    query_num_bit_on = self.count_bits_set(fp_vector)

    scope = where('num_set_bits >= ?', (threshold * query_num_bit_on).floor)
            .where('num_set_bits <= ?', (query_num_bit_on / threshold).floor)
    NUMBER_OF_FINGERPRINT_COL.times { |i|
      scope = scope.where("fp#{i}  & ? = ?",
                          "%064b" % fp_vector[i],
                          "%064b" % fp_vector[i])
    }

    return scope
  }

  def self.find_or_create_by_molfile molfile, is_partial = false

    new_molfile = if is_partial
                    self.skip_residues(molfile)
                  else
                    molfile
                  end

    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(new_molfile, is_partial)
    babel_info[:fp] = Chemotion::OpenBabelService.fingerprint_from_molfile(molfile, is_partial)

    inchikey = babel_info[:inchikey]
    unless inchikey.blank?

      #todo: consistent naming

      molecule = Molecule.find_or_create_by(inchikey: inchikey,
        is_partial: is_partial) do |molecule|
        pubchem_info =
          Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)

        molecule.molfile = new_molfile
        molecule.assign_molecule_data babel_info, pubchem_info

      end
      molecule
    end
  end

  def refresh_molecule_data
    babel_info =
      Chemotion::OpenBabelService.molecule_info_from_molfile(self.molfile)
    inchikey = babel_info[:inchikey]
    unless inchikey.blank?
      pubchem_info =
        Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)

      self.assign_molecule_data babel_info, pubchem_info
      self.save!
    end
  end

  def assign_molecule_data babel_info, pubchem_info
    self.inchistring = babel_info[:inchi]
    self.sum_formular = babel_info[:formula]
    self.molecular_weight = babel_info[:mol_wt]
    self.exact_molecular_weight = babel_info[:mass]
    self.iupac_name = pubchem_info[:iupac_name]
    self.names = pubchem_info[:names]

    self.check_sum_formular # correct exact and average MW for resins

    self.attach_svg babel_info[:svg]

    self.cano_smiles = babel_info[:cano_smiles]

    fp_vector = babel_info[:fp]

    self.fp0  = "%064b" % fp_vector[0]
    self.fp1  = "%064b" % fp_vector[1]
    self.fp2  = "%064b" % fp_vector[2]
    self.fp3  = "%064b" % fp_vector[3]
    self.fp4  = "%064b" % fp_vector[4]
    self.fp5  = "%064b" % fp_vector[5]
    self.fp6  = "%064b" % fp_vector[6]
    self.fp7  = "%064b" % fp_vector[7]
    self.fp8  = "%064b" % fp_vector[8]
    self.fp9  = "%064b" % fp_vector[9]
    self.fp10 = "%064b" % fp_vector[10]
    self.fp11 = "%064b" % fp_vector[11]
    self.fp12 = "%064b" % fp_vector[12]
    self.fp13 = "%064b" % fp_vector[13]
    self.fp14 = "%064b" % fp_vector[14]
    self.fp15 = "%064b" % fp_vector[15]

    self.num_set_bits = self.class.count_bits_set(fp_vector)
  end

  def attach_svg svg_data
    return unless svg_data.match /\A<\?xml/

    svg_file_name = if self.is_partial
      "#{SecureRandom.hex(64)}Part.svg"
    else
      "#{SecureRandom.hex(64)}.svg"
    end
    svg_file_path = "public/images/molecules/#{svg_file_name}"

    svg_file = File.new(svg_file_path, 'w+')
    svg_file.write(svg_data)
    svg_file.close

    self.molecule_svg_file = svg_file_name
  end

  # skip residues in molfile and replace with Hydrogens
  # in order to save at least known part of molecule
  def self.skip_residues molfile
    molfile.gsub! /(M.+RGP[\d ]+)/, ''
    molfile.gsub! /(> <PolymersList>[\W\w.\n]+[\d]+)/m, ''

    lines = molfile.split "\n"

    lines[4..-1].each do |line|
      break if line.match /(M.+END+)/

      line.gsub! ' R# ', ' H  ' # replace residues with Hydrogens
    end

    lines.join "\n"
  end

  # remove additional H in formula and in molecular_weight
  def check_sum_formular
    return unless self.is_partial

    atomic_weight_h = Chemotion::PeriodicTable.get_atomic_weight 'H'
    self.molecular_weight -= atomic_weight_h
    self.exact_molecular_weight -= atomic_weight_h

    fdata = Chemotion::Calculations.parse_formula self.sum_formular, true
    self.sum_formular = fdata.map do |key, value|
      if value == 0
        ''
      elsif value == 1
        key
      else
        key + value.to_s
      end
    end.join
  end

private

  # TODO: check that molecules are OK and remove this method. fix is in editor
  def sanitize_molfile
    index = self.molfile.lines.index { |l| l.match /(M.+END+)/ }
    self.molfile = self.molfile.lines[0..index].join if index.is_a?(Integer)
  end
end
