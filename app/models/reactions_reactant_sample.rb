class ReactionsReactantSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :reaction
  belongs_to :sample

  include Reactable
  include ReactionSampleCollections

  def self.get_samples reaction_ids
    self.where(reaction_id: reaction_ids).pluck(:sample_id).compact.uniq
  end

  def self.get_reactions samples_ids
    self.where(sample_id: samples_ids).pluck(:reaction_id).compact.uniq
  end
end
