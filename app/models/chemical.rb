# frozen_string_literal: true

# == Schema Information
#
# Table name: chemicals
#
#  id                              :bigint           not null, primary key
#  cas                             :text
#  chemical_data                   :jsonb
#  deleted_at                      :datetime
#  updated_at                      :datetime
#  sample_id                       :integer
#  sequence_based_macromolecule_id :bigint
#
# Foreign Keys
#
#  fk_rails_...  (sequence_based_macromolecule_id => sequence_based_macromolecules.id)
#

class Chemical < ApplicationRecord
  has_logidze
  acts_as_paranoid
  belongs_to :sample
end
