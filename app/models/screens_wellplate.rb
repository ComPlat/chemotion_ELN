class ScreensWellplate < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :screen
  belongs_to :wellplate
end
