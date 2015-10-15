class ScreensWellplate < ActiveRecord::Base
  belongs_to :screen
  belongs_to :wellplate
end
