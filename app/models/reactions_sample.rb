class ReactionsSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :reaction
  belongs_to :sample

  include ReactionSampleCollections

  def self.get_samples(reaction_ids)
    self.where(reaction_id: reaction_ids).pluck(:sample_id).compact.uniq
  end

  def self.get_reactions samples_ids
    self.where(sample_id: samples_ids).pluck(:reaction_id).compact.uniq
  end
end

class ReactionsStartingMaterialSample < ReactionsSample
  include Tagging
end

class ReactionsReactantSample < ReactionsSample
  include Reactable
end

class ReactionsSolventSample < ReactionsSample
  include Reactable
end

class ReactionsProductSample < ReactionsSample
  include Reactable
  include Tagging

  def formatted_yield
    eq = self.equivalent
    eq && !eq.nan? ? "#{(eq * 100).round.to_s} %" : "0 %"
  end
end
