# == Schema Information
#
# Table name: scan_tasks
#
#  id                :bigint           not null, primary key
#  status            :string           default("To do")
#  measurement_value :float
#  measurement_unit  :string           default("g"), not null
#  description       :string
#  private_note      :string
#  additional_note   :string
#  created_at        :datetime         not null
#  created_by        :integer          not null
#  updated_at        :datetime
#  sample_id         :bigint
#  attachment_id     :bigint
#
# Indexes
#
#  index_scan_tasks_on_attachment_id  (attachment_id)
#  index_scan_tasks_on_sample_id      (sample_id)
#
# Foreign Keys
#
#  fk_rails_...  (sample_id => samples.id)
#

class ScanTask < ApplicationRecord
  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  belongs_to :sample, foreign_key: :sample_id, optional: false
  belongs_to :attachment, foreign_key: :attachment_id, class_name: 'Attachment', dependent: :destroy, optional: true
  accepts_nested_attributes_for :attachment
end
