# frozen_string_literal: true

# == Schema Information
#
# Table name: fingerprints
#
#  id           :integer          not null, primary key
#  fp0          :bit(64)
#  fp1          :bit(64)
#  fp2          :bit(64)
#  fp3          :bit(64)
#  fp4          :bit(64)
#  fp5          :bit(64)
#  fp6          :bit(64)
#  fp7          :bit(64)
#  fp8          :bit(64)
#  fp9          :bit(64)
#  fp10         :bit(64)
#  fp11         :bit(64)
#  fp12         :bit(64)
#  fp13         :bit(64)
#  fp14         :bit(64)
#  fp15         :bit(64)
#  num_set_bits :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  deleted_at   :time
#

class Fingerprint < ActiveRecord::Base
  # acts_as_paranoid
  include Collectable

  has_many :samples, dependent: :restrict_with_error

  validates :fp0, :fp1, :fp2, :fp3, :fp4, :fp5, :fp6, :fp7, :fp8,
            :fp9, :fp10, :fp11, :fp12, :fp13, :fp14, :fp15,
            format: { with: /[01]/, message: 'only allows 0 or 1' },
            length: {
              minimum: 64,
              maximum: 64,
              wrong_length: 'must be exactly 64 characters'
            },
            presence: true

  # validates :fp0, uniqueness: {
  #                  scope: [
  #                    :fp1, :fp2, :fp3, :fp4, :fp5, :fp6, :fp7, :fp8,
  #                    :fp9, :fp10, :fp11, :fp12, :fp13, :fp14, :fp15
  #                  ],
  #                  message: 'existed fingerprint'
  #                 }

  validates :num_set_bits,
            presence: true,
            numericality: {
              only_integer: true,
              greater_than_or_equal_to: 0,
              less_than: 1024,
              message: 'must be integer between 0 and 1024'
            }

  before_create :check_num_set_bits
  # before_save :check_fingerprint_exist

  # NUMBER OF FINGERPRINT COLUMNS - 1
  NUMBER_OF_FINGERPRINT_COL = 15

  scope :search_similar, ->(fp_vector, threshold, tanimoto_ordered = true, molfile = nil) {
    fp_vector = Chemotion::OpenBabelService.bin_fingerprint_from_molfile(molfile) if molfile
    threshold = threshold.to_f
    query_num_set_bits = count_bits_set(fp_vector)

    sim_query = sanitize_sql_for_conditions(
      [sql_query_similar, query_num_set_bits] + fp_vector + [
        (threshold * query_num_set_bits).floor,
        (query_num_set_bits / threshold).ceil
      ]
    )

    query = joins(sim_query)
    tanimoto_ordered ? query.order('tanimoto desc') : query
  }

  scope :screen_sub, ->(fp_vector) {
    where(
      (1..NUMBER_OF_FINGERPRINT_COL).inject('fp0 & ? = ?') { |a, b| a + " and fp#{b} & ? = ?" },
      *fp_vector.inject([]) { |sum, v| sum + [v, v] }
    )
  }

  scope :by_bin_vector, ->(fp_vector) {
    where(
      (1..NUMBER_OF_FINGERPRINT_COL).inject('fp0 = ?') { |a, b| a + " and fp#{b} = ?" },
      *fp_vector
    )
  }

  class <<self
    def sql_query_similar(table_column = 'fingerprints.id')
      <<~SQL
        INNER JOIN (
          SELECT id,
            (common_set_bit::float8 / (? + num_set_bits - common_set_bit)::float8) AS tanimoto
          FROM (
            SELECT id, num_set_bits,
              LENGTH(TRANSLATE(CONCAT(
                  (fp0 & ?)::text, (fp1 & ?)::text, (fp2 & ?)::text, (fp3 & ?)::text,
                  (fp4 & ?)::text, (fp5 & ?)::text, (fp6 & ?)::text, (fp7 & ?)::text,
                  (fp8 & ?)::text, (fp9 & ?)::text, (fp10 & ?)::text, (fp11 & ?)::text,
                  (fp12 & ?)::text, (fp13 & ?)::text, (fp14 & ?)::text, (fp15 & ?)::text
                ),'0','')
              ) AS common_set_bit
            FROM fingerprints
            WHERE num_set_bits BETWEEN ? AND ? -- AND fingerprints."deleted_at" IS NULL
          ) subquery
        ) AS "fps" ON "fps"."id" = #{table_column}
      SQL
    end

    def count_bits_set(fp_vector)
      fp_vector.reduce(0) { |sum, v| sum + v.count('1') }
    end

    def find_or_create_by_molfile(molfile)
      return unless molfile.present?

      molfile = standardized_molfile(molfile)
      fp_vector = Chemotion::OpenBabelService.bin_fingerprint_from_molfile(molfile)

      existed_fp = by_bin_vector(fp_vector).first
      return existed_fp if existed_fp

      fp = Fingerprint.new
      (0..NUMBER_OF_FINGERPRINT_COL).each do |i|
        fp['fp' + i.to_s] = fp_vector[i]
      end
      fp.num_set_bits = count_bits_set(fp_vector)
      fp.save!
      fp
    end

    def standardized_molfile(molfile)
      return molfile unless molfile.include? 'R#'

      mf = molfile.gsub(/(> <PolymersList>[\W\w.\n]+[\d]+)/m, '')

      if mf.include? ' R# '
        lines = mf.split "\n"
        lines[4..-1].each do |line|
          break if line =~ /(M.+END+)/

          line.gsub!(' R# ', ' R1  ')
        end
        mf = lines.join "\n"
      end

      mf
    end

    def generate_sample_fingerprint
      (1..64).map { [0, 1].sample }.join
    end
  end

  def vector_bin
    Array.new(NUMBER_OF_FINGERPRINT_COL + 1) { |i| self['fp' + i.to_s] }
  end

  # Self-generate num_set_bits if zero?
  def check_num_set_bits
    return unless num_set_bits.zero?

    self.num_set_bits = vector_bin.reduce(0) { |sum, v| sum + v.count('1') }
  end

  def check_fingerprint_exist
    self.class.by_bin_vector(vector_bin).count.zero?
  end
end
