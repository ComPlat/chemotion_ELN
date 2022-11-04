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
#  user_id           :bigint           not null
#  sample_id         :bigint
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#
# Indexes
#
#  index_sample_tasks_on_sample_id  (sample_id)
#  index_sample_tasks_on_user_id    (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (sample_id => samples.id)
#  fk_rails_...  (user_id => users.id)
#
class SampleTask < ApplicationRecord
  belongs_to :creator, foreign_key: :created_by, class_name: 'Person'
  belongs_to :sample, optional: true
  has_one :attachments, as: :attachable
end
