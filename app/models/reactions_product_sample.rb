class ReactionsProductSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :reaction
  belongs_to :sample

  include Reactable

  def formatted_yield
    (self.equivalent * 100).round(2).to_s + ' %'
  end
end
