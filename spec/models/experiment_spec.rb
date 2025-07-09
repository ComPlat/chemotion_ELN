# frozen_string_literal: true

# == Schema Information
#
# Table name: experiments
#
#  id                  :integer          not null, primary key
#  ancestry            :string
#  description         :text
#  experimentable_type :string
#  name                :string
#  parameter           :jsonb
#  status              :string(20)
#  type                :string(20)
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  container_id        :integer
#  device_id           :integer
#  experimentable_id   :integer
#  parent_id           :integer
#  user_id             :integer
#
require 'rails_helper'

RSpec.describe Experiment, type: :model do
  pending "add some examples to (or delete) #{__FILE__}"
end
