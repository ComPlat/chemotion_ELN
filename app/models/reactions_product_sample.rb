class ReactionsProductSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :reaction
  belongs_to :sample

  include Reactable

  def formatted_yield
    self.equivalent ? (self.equivalent * 100).to_s + " %" : " %"
  end
end
