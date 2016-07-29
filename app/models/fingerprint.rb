class Fingerprint < ActiveRecord::Base
  acts_as_paranoid
  include Collectable

  has_many :samples

  NUMBER_OF_FINGERPRINT_COL = 16

  def self.count_bits_set(fp_vector)
    query_num_set_bits = 0

    fp_vector.each do |fp|
      num_bit_on = ("%064b" % fp).count("1")
      query_num_set_bits = query_num_set_bits + num_bit_on
    end

    return query_num_set_bits
  end

  scope :by_tanimoto_coefficient, -> (fp_vector,
                                      page,
                                      page_size,
                                      threshold) {
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

    new_fp = Fingerprint.unscoped.select(query)

    query_num_set_bits = self.count_bits_set(fp_vector)

    new_fp = new_fp.where('num_set_bits >= ?', (threshold * query_num_set_bits).floor)
                   .where('num_set_bits <= ?', (query_num_set_bits / threshold).floor)

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
    tanimoto = unscoped.from("(#{common_set_bits.to_sql}) AS common_bits ORDER BY tanimoto DESC")
                       .select(query).page(page).per(page_size)

    return tanimoto.map(&:id)
  }

  def self.find_or_create_by_molfile molfile
    fp_vector = Chemotion::OpenBabelService.fingerprint_from_molfile molfile

    old_fp = Fingerprint.where("fp0  & ? = ?", "%064b" % fp_vector[0], "%064b" % fp_vector[0])
    (1..15).each do |i|
      old_fp = old_fp.where("fp#{i}  & ? = ?",
                            "%064b" % fp_vector[i],
                            "%064b" % fp_vector[i])
    end
    
    if old_fp.count == 0
      fp = Fingerprint.create()

      fp.fp0  = "%064b" % fp_vector[0]
      fp.fp1  = "%064b" % fp_vector[1]
      fp.fp2  = "%064b" % fp_vector[2]
      fp.fp3  = "%064b" % fp_vector[3]
      fp.fp4  = "%064b" % fp_vector[4]
      fp.fp5  = "%064b" % fp_vector[5]
      fp.fp6  = "%064b" % fp_vector[6]
      fp.fp7  = "%064b" % fp_vector[7]
      fp.fp8  = "%064b" % fp_vector[8]
      fp.fp9  = "%064b" % fp_vector[9]
      fp.fp10 = "%064b" % fp_vector[10]
      fp.fp11 = "%064b" % fp_vector[11]
      fp.fp12 = "%064b" % fp_vector[12]
      fp.fp13 = "%064b" % fp_vector[13]
      fp.fp14 = "%064b" % fp_vector[14]
      fp.fp15 = "%064b" % fp_vector[15]

      fp.num_set_bits = fp.count_bits_set(fp_vector)
      fp.save!
    end

    return fp.id
  end

  def self.standardized_molfile molfile
    molfile.gsub! /(> <PolymersList>[\W\w.\n]+[\d]+)/m, ''

    if molfile.include? ' R# '
      lines = molfile.split "\n"
      lines[4..-1].each do |line|
        break if line.match /(M.+END+)/
        line.gsub! ' R# ', ' R1  ' # replace residues with Hydrogens
      end
      molfile = lines.join "\n"
    end

    return molfile
  end
end
