# frozen_string_literal: true

# == Schema Information
#
# Table name: sample_tasks
#
#  id                :bigint           not null, primary key
#  measurement_value :float
#  measurement_unit  :string           default("g"), not null
#  description       :string
#  private_note      :string
#  additional_note   :string
#  creator_id        :bigint           not null
#  sample_id         :bigint
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
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
  has_one :attachment, as: :attachable, dependent: :destroy

  scope :for, ->(user) { where(creator: user) }
  scope :open, -> { with_sample.without_attachment.without_scan_data }
  scope :open_free_scan, -> { without_sample.with_attachment.with_scan_data }
  scope :done, -> { with_sample.with_attachment.with_scan_data }

  scope :with_sample, -> { where.not(sample_id: nil) }
  scope :without_sample, -> { where(sample_id: nil) }
  scope :with_attachment, -> { joins(:attachment) }
  scope :without_attachment, -> { left_joins(:attachment).where(attachments: { id: nil }) }
  scope :with_scan_data, -> { where.not(measurement_value: nil) }
  scope :without_scan_data, -> { where(measurement_value: nil) }

  validate :sample_or_scan_data_required, on: :create

  accepts_nested_attributes_for :attachment, reject_if: :all_blank

  private

  def sample_or_scan_data_required
    create_as_planned_sample_task = sample.present?
    create_as_free_scan = sample.nil? && measurement_value.present? && attachment.present?

    return if create_as_planned_sample_task || create_as_free_scan

    errors.add(:base, :sample_or_scan_data_required)
  end
end
