# frozen_string_literal: true

# == Schema Information
#
# Table name: chemicals
#
#  id            :bigint           not null, primary key
#  sample_id     :integer
#  cas           :text
#  chemical_data :jsonb
#

class Chemical < ApplicationRecord
  has_logidze
  acts_as_paranoid
  belongs_to :sample
end
