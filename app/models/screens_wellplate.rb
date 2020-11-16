# == Schema Information
#
# Table name: screens_wellplates
#
#  id           :integer          not null, primary key
#  screen_id    :integer
#  wellplate_id :integer
#  deleted_at   :datetime
#
# Indexes
#
#  index_screens_wellplates_on_deleted_at    (deleted_at)
#  index_screens_wellplates_on_screen_id     (screen_id)
#  index_screens_wellplates_on_wellplate_id  (wellplate_id)
#

class ScreensWellplate < ApplicationRecord
  acts_as_paranoid
  belongs_to :screen
  belongs_to :wellplate

  def self.get_wellplates screen_ids
    self.where(screen_id: screen_ids).pluck(:wellplate_id).compact.uniq
  end

end
