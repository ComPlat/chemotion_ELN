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
  HEX_COLOR_REGEX = /\A#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\z/.freeze
  # Mirrors the +wells.label+ column default; a well still carrying it has not
  # been labelled by a user. See {#content?}.
  DEFAULT_LABEL = 'Molecular structure'
  has_logidze
  acts_as_paranoid
  belongs_to :wellplate
  belongs_to :sample, optional: true

  include Tagging

  validates :color_code,
            format: { with: HEX_COLOR_REGEX, message: :invalid_hex_color },
            allow_blank: true

  def self.get_samples_in_wellplates(wellplate_ids)
    where(wellplate_id: wellplate_ids).pluck(:sample_id).compact.uniq
  end

  def readouts
    read_attribute(:readouts) || []
  end

  # Whether the well holds anything a user put there.
  #
  # Used to decide whether shrinking a wellplate may drop this well. Both
  # +label+ and +readouts+ have non-null column defaults, so a bare presence
  # check would report every untouched well as occupied and make shrinking
  # impossible. +sample+ is read through the association rather than
  # +sample_id+ on purpose: {Sample} is +acts_as_paranoid+ and
  # {Usecases::Wellplates::WellplateUpdater#update_wells} destroys samples
  # without nulling the column, so dangling ids are common and must read as
  # empty.
  #
  # @return [Boolean]
  def content?
    sample.present? || additive.present? || color_code.present? ||
      (label.present? && label != DEFAULT_LABEL) ||
      readouts.any? { |readout| readout_filled?(readout) }
  end

  # translates well position within wellplate: X=2 Y=3 -> C2
  def alphanumeric_position
    # A non-positive row would index the label table from the end (y=0 -> "ZZ"),
    # naming a cell that does not exist. Reachable since Resize reports wells
    # with a below-one position as blocking a shrink.
    return 'n/a' unless placeable?

    row = ('A'..'ZZ').to_a[position_y - 1]
    "#{row}#{position_x}"
  end

  def sortable_alphanumeric_position
    return 'n/a' unless placeable?

    row = ('A'..'ZZ').to_a[position_y - 1]
    "#{row}#{format('%02i', position_x)}"
  end

  # Whether the well sits at a position any grid could hold. Mirrors
  # Wellplate.positionOutside on the client.
  #
  # @return [Boolean]
  def placeable?
    position_x.present? && position_y.present? && position_x.positive? && position_y.positive?
  end

  private

  # @param readout [Object] one entry of {#readouts}; jsonb yields string keys
  #   when loaded from the DB and symbol keys when built in memory
  # @return [Boolean] whether the entry carries a value or a unit
  def readout_filled?(readout)
    return false unless readout.is_a?(Hash)

    entry = readout.with_indifferent_access
    entry[:value].present? || entry[:unit].present?
  end
end
