# frozen_string_literal: true

# == Schema Information
#
# Table name: user_task_model_mappings
#
#  id         :bigint           not null, primary key
#  model      :string           not null
#  task_name  :string           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :bigint           not null
#
# Indexes
#
#  index_user_task_model_mappings_on_user_id                (user_id)
#  index_user_task_model_mappings_on_user_id_and_task_name  (user_id,task_name) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
class UserTaskModelMapping < ApplicationRecord
  belongs_to :user

  validates :task_name, presence: true
  validates :model,     presence: true
  validates :task_name, uniqueness: { scope: :user_id }
end
