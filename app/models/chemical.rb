# frozen_string_literal: true

# == Schema Information
#
# Table name: chemicals
#
#  id            :bigint           not null, primary key
#  cas           :text
#  chemical_data :jsonb
#  deleted_at    :datetime
#  updated_at    :datetime
#  sample_id     :integer
#

class Chemical < ApplicationRecord
  has_logidze
  acts_as_paranoid
  belongs_to :sample
end
