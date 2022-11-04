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
# Indexes
#
#  index_chemicals_on_sample_id  (sample_id)
#

class Chemical < ApplicationRecord
  belongs_to :sample
end
