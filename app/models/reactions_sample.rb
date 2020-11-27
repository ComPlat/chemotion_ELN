# == Schema Information
#
# Table name: reactions_samples
#
#  id          :integer          not null, primary key
#  reaction_id :integer
#  sample_id   :integer
#  reference   :boolean
#  equivalent  :float
#  position    :integer
#  type        :string
#  deleted_at  :datetime
#  waste       :boolean          default(FALSE)
#  coefficient :float            default(1.0)
#
# Indexes
#
#  index_reactions_samples_on_reaction_id  (reaction_id)
#  index_reactions_samples_on_sample_id    (sample_id)
#

class ReactionsSample < ApplicationRecord
  acts_as_paranoid
  belongs_to :reaction, optional: true
  belongs_to :sample, optional: true

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
  include Reactable
end

class ReactionsReactantSample < ReactionsSample
  include Tagging
  include Reactable
end

class ReactionsSolventSample < ReactionsSample
  include Reactable
end

class ReactionsPurificationSolventSample < ReactionsSample
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
