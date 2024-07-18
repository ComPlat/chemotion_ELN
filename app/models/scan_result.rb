# frozen_string_literal: true

# == Schema Information
#
# Table name: scan_results
#
#  id                :bigint           not null, primary key
#  measurement_value :float            not null
#  measurement_unit  :string           default("g"), not null
#  title             :string
#  position          :integer          default(0), not null
#  sample_task_id    :bigint
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#
# Indexes
#
#  index_scan_results_on_sample_task_id  (sample_task_id)
#
class ScanResult < ApplicationRecord
  belongs_to :sample_task
  has_one :attachment, as: :attachable, dependent: :destroy
  accepts_nested_attributes_for :attachment, reject_if: :all_blank

  validates :measurement_value, :measurement_unit, presence: true
  validates :measurement_value, :measurement_unit, :attachment, presence: true

  def -(other)
    self.class.new(
      measurement_value: measurement_value_in_mg - other.measurement_value_in_mg,
      measurement_unit: 'mg',
    )
  end

  def measurement_value_in_mg
    return measurement_value if measurement_unit == 'mg'

    measurement_value * 1000
  end
end
