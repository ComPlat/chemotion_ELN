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
    eq = self.equivalent
    eq && !eq.nan? ? "#{(eq * 100).round.to_s} %" : "0 %"
  end
end
