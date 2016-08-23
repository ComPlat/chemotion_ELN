class Fingerprint < ActiveRecord::Base
  acts_as_paranoid
  include Collectable

  has_many :samples, :dependent => :restrict_with_error

  validates :fp0, :fp1, :fp2, :fp3, :fp4, :fp5, :fp6, :fp7, :fp8,
            :fp9, :fp10, :fp11, :fp12, :fp13, :fp14, :fp15,
            format: { with: /[01]/, message: "only allows 0 or 1" },
            length: {
              minimum: 64,
              maximum: 64,
              wrong_length: "must be exactly 64 characters"
            },
            presence: true

 validates :fp0, uniqueness: {
                  scope: [
                    :fp1, :fp2, :fp3, :fp4, :fp5, :fp6, :fp7, :fp8,
                    :fp9, :fp10, :fp11, :fp12, :fp13, :fp14, :fp15
                  ],
                  message: "existed fingerprint"
                 }


  validates :num_set_bits,
            presence: true,
            numericality: {
              only_integer: true,
              greater_than: 0,
              less_than: 1024,
              message: "must be integer between 0 and 1024"
            }

  after_create :check_num_set_bits
  before_save :check_fingerprint_exist

  NUMBER_OF_FINGERPRINT_COL = 16

  def self.count_bits_set(fp_vector)
    query_num_set_bits = 0

    fp_vector.each do |fp|
      num_bit_on = ("%064b" % fp).count("1")
      query_num_set_bits = query_num_set_bits + num_bit_on
    end

    return query_num_set_bits
  end

  scope :search_similar, -> (fp_vector, threshold) {
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
      ]
    )

    new_fp = Fingerprint.unscoped.select(query)
            .where('num_set_bits >= ?', (threshold * query_num_set_bits).floor)
            .where('num_set_bits <= ?', (query_num_set_bits / threshold).floor)

    common_set_bits = unscoped.from("(#{new_fp.to_sql}) AS new_fp")
      .select(
        "*,
        LENGTH(TRANSLATE(
          CONCAT(new_fp.n0::text, new_fp.n1::text, new_fp.n2::text,
                 new_fp.n3::text, new_fp.n4::text, new_fp.n5::text,
                 new_fp.n6::text, new_fp.n7::text, new_fp.n8::text,
                 new_fp.n9::text, new_fp.n10::text, new_fp.n11::text,
                 new_fp.n12::text, new_fp.n13::text,
                 new_fp.n14::text, new_fp.n15::text),
          '0',
          '')) as common_set_bit")
    query = sanitize_sql_for_conditions(
      [
        "id,
        (common_set_bit::float8 / (? + num_set_bits - common_set_bit)::float8) AS tanimoto",
        query_num_set_bits
      ]
    )
    tanimoto = unscoped.from("(#{common_set_bits.to_sql}) AS common_bits ORDER BY tanimoto DESC")
                       .select(query)

    return tanimoto.map(&:id)
  }

  scope :screen_sub, -> (fp_vector) {
    screen = Fingerprint.all
    NUMBER_OF_FINGERPRINT_COL.times do |i|
      screen = screen.where("fp#{i} & ? = ?",
                            "%064b" % fp_vector[i],
                            "%064b" % fp_vector[i])
    end

    return screen.pluck(:id)
  }

  def self.find_or_create_by_molfile molfile    
    molfile = self.standardized_molfile(molfile)
    fp_vector = Chemotion::OpenBabelService.fingerprint_from_molfile molfile
    existed_fp = Fingerprint.all
    NUMBER_OF_FINGERPRINT_COL.times do |i|
      existed_fp = existed_fp.where("fp#{i} = ?", "%064b" % fp_vector[i])
    end

    # Return id of the existed record
    return existed_fp.first.id unless existed_fp.count == 0

    fp = Fingerprint.create()

    NUMBER_OF_FINGERPRINT_COL.times { |i|
      fp_name = "fp" + i.to_s + "="
      fp.send(fp_name, "%064b" % fp_vector[i])
    }

    fp.num_set_bits = self.count_bits_set(fp_vector)
    fp.save!
    return fp.id
  end

  def self.standardized_molfile molfile
    return molfile unless molfile.include? 'R#'

    molfile.gsub! /(> <PolymersList>[\W\w.\n]+[\d]+)/m, ''

    if molfile.include? ' R# '
      lines = molfile.split "\n"
      lines[4..-1].each do |line|
        break if line.match /(M.+END+)/
        line.gsub! ' R# ', ' R1  '
      end
      molfile = lines.join "\n"
    end

    return molfile
  end

  def self.generate_sample_fingerprint
    (1..64).map { [0, 1].sample }.join
  end

  def check_num_set_bits
    return unless self.num_set_bits == 0

    # Self-generate num_set_bits
    NUMBER_OF_FINGERPRINT_COL.times { |i|
      self.num_set_bits = self.num_set_bits +
                          self.send("fp" + i.to_s).count("1")
    }
  end

  def check_fingerprint_exist
    existed_fp = Fingerprint.all
    NUMBER_OF_FINGERPRINT_COL.times do |i|
      existed_fp = existed_fp.where("fp#{i} = ?", self["fp" + i.to_s])
    end

    return (existed_fp.count == 0)
  end
end
