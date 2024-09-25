# frozen_string_literal: true

# == Schema Information
#
# Table name: wells
#
#  id           :integer          not null, primary key
#  sample_id    :integer
#  wellplate_id :integer          not null
#  position_x   :integer
#  position_y   :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  additive     :string
#  deleted_at   :datetime
#  readouts     :jsonb
#  label        :string           default("Molecular structure"), not null
#  color_code   :string
#
# Indexes
#
#  index_wells_on_deleted_at    (deleted_at)
#  index_wells_on_sample_id     (sample_id)
#  index_wells_on_wellplate_id  (wellplate_id)
#

class Well < ApplicationRecord
  has_logidze
  acts_as_paranoid
  belongs_to :wellplate
  belongs_to :sample, optional: true

  include Tagging

  def self.get_samples_in_wellplates(wellplate_ids)
    where(wellplate_id: wellplate_ids).pluck(:sample_id).compact.uniq
  end

  def readouts
    read_attribute(:readouts) || []
  end

  # translates well position within wellplate: X=2 Y=3 -> C2
  def alphanumeric_position
    return 'n/a' if position_x.nil? || position_y.nil?

    row = ('A'..'ZZ').to_a[position_y - 1]
    "#{row}#{position_x}"
  end

  def sortable_alphanumeric_position
    return 'n/a' if position_x.nil? || position_y.nil?

    row = ('A'..'ZZ').to_a[position_y - 1]
    "#{row}#{format('%02i', position_x)}"
  end
end
