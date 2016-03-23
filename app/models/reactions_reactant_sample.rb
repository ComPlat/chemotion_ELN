class ReactionsReactantSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :reaction
  belongs_to :sample

  include Reactable
end
