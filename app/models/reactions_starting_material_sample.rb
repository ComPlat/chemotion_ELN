class ReactionsStartingMaterialSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :reaction
  belongs_to :sample
  
  include ReactionSampleCollections

  def self.get_samples reaction_ids
    self.where(reaction_id: reaction_ids).pluck(:sample_id).compact.uniq
  end
end
