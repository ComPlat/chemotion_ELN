# == Schema Information
#
# Table name: reactions_samples
#
#  id                      :integer          not null, primary key
#  reaction_id             :integer
#  sample_id               :integer
#  reference               :boolean
#  equivalent              :float
#  position                :integer
#  type                    :string
#  deleted_at              :datetime
#  waste                   :boolean          default(FALSE)
#  coefficient             :float            default(1.0)
#  show_label              :boolean          default(FALSE), not null
#  gas_type                :integer          default("off")
#  gas_phase_data          :jsonb
#  conversion_rate         :float
#  created_at  :datetime         default(Fri, 01 Oct 2021 00:00:00 UTC +00:00), not null
#  updated_at  :datetime         default(Fri, 01 Oct 2021 00:00:00 UTC +00:00), not null
#
# Indexes
#
#  index_reactions_samples_on_reaction_id  (reaction_id)
#  index_reactions_samples_on_sample_id    (sample_id)
#

class ReactionsSample < ApplicationRecord
  has_logidze
  acts_as_paranoid
  belongs_to :reaction, optional: true
  belongs_to :sample, optional: true

  before_validation :set_default

  include ReactionSampleCollections

  enum gas_type: { off: 0, feedstock: 1, catalyst: 2, gas: 3 }

  def self.get_samples(reaction_ids)
    where(reaction_id: reaction_ids).pluck(:sample_id).compact.uniq
  end

  def self.get_reactions(samples_ids)
    where(sample_id: samples_ids).pluck(:reaction_id).compact.uniq
  end

  private

  def set_default
    1 if coefficient.nil? || coefficient&.zero?
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
