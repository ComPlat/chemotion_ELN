# frozen_string_literal: true

# == Schema Information
#
# Table name: residues
#
#  id           :integer          not null, primary key
#  sample_id    :integer
#  residue_type :string
#  custom_info  :hstore
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#
# Indexes
#
#  index_residues_on_sample_id  (sample_id)
#

class Residue < ApplicationRecord
  has_logidze

  belongs_to :sample, optional: true

  TYPES = Hash[*%i[polymer residue].collect { |v| [v, v] }.flatten]
end
