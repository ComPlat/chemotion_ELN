# == Schema Information
#
# Table name: wells
#
#  id           :integer          not null, primary key
#  sample_id    :integer
#  wellplate_id :integer          not null
#  position_x   :integer
#  position_y   :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  readout      :string
#  additive     :string
#  deleted_at   :datetime
#
# Indexes
#
#  index_wells_on_deleted_at    (deleted_at)
#  index_wells_on_sample_id     (sample_id)
#  index_wells_on_wellplate_id  (wellplate_id)
#

class Well < ApplicationRecord
  acts_as_paranoid
  belongs_to :wellplate
  belongs_to :sample

  include Tagging

  def self.get_samples_in_wellplates(wellplate_ids)
    where(wellplate_id: wellplate_ids).pluck(:sample_id).compact.uniq
  end
end
