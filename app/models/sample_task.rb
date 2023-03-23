# frozen_string_literal: true

# == Schema Information
#
# Table name: sample_tasks
#
#  id                    :bigint           not null, primary key
#  result_value          :float
#  result_unit           :string           default("g"), not null
#  creator_id            :bigint           not null
#  sample_id             :bigint
#  created_at            :datetime         not null
#  updated_at            :datetime         not null
#  description           :string
#  required_scan_results :integer          default(1), not null
#
# Indexes
#
#  index_sample_tasks_on_creator_id  (creator_id)
#  index_sample_tasks_on_sample_id   (sample_id)
#
# Foreign Keys
#
#  fk_rails_...  (creator_id => users.id)
#  fk_rails_...  (sample_id => samples.id)
#
class SampleTask < ApplicationRecord
  belongs_to :creator, class_name: 'Person'
  belongs_to :sample, optional: true
  has_many :scan_results, dependent: :destroy

  scope :for, ->(user) { where(creator: user) }
  scope :open, -> { without_result_data }
  scope :done, -> { with_sample.with_result_data }

  scope :with_sample, -> { where.not(sample_id: nil) }
  scope :without_sample, -> { where(sample_id: nil) }
  scope :with_result_data, -> { where.not(result_value: nil) }
  scope :without_result_data, -> { where(result_value: nil) }
  scope(
    :with_missing_scan_results,
    lambda do
      left_joins(:scan_results)
      .select('sample_tasks.*, count(scan_results.id)')
      .group(:id)
      .having('count(scan_results.id) < required_scan_results')
    end,
  )

  validates :required_scan_results, inclusion: { in: [1, 2] }, allow_nil: false

  def done?
    sample_id.present? &&
      result_value.present? &&
      result_unit.present? &&
      scan_results.count == required_scan_results
  end
end
