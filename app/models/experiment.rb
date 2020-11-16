# == Schema Information
#
# Table name: experiments
#
#  id                  :integer          not null, primary key
#  type                :string(20)
#  name                :string
#  description         :text
#  status              :string(20)
#  parameter           :jsonb
#  user_id             :integer
#  device_id           :integer
#  container_id        :integer
#  experimentable_id   :integer
#  experimentable_type :string
#  ancestry            :string
#  parent_id           :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#

class Experiment < ApplicationRecord
  belongs_to :device
  belongs_to :container
  belongs_to :experimentable, :polymorphic => true
end
