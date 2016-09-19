class ScreensWellplate < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :screen
  belongs_to :wellplate

  def self.get_wellplates screen_ids
    self.where(screen_id: screen_ids).pluck(:wellplate_id).compact.uniq
  end

end
