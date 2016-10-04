class ReactionsProductSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :reaction
  belongs_to :sample

  include Reactable
  include ReactionSampleCollections

  def self.get_samples reaction_ids
    self.where(reaction_id: reaction_ids).pluck(:sample_id).compact.uniq
  end

  def formatted_yield
    self.equivalent ? (self.equivalent * 100).to_s + " %" : " %"
  end
end
