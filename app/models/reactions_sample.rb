# frozen_string_literal: true

# == Schema Information
#
# Table name: reactions_samples
#
#  id                          :integer          not null, primary key
#  coefficient                 :float            default(1.0)
#  conversion_rate             :float
#  deleted_at                  :datetime
#  equivalent                  :float
#  gas_phase_data              :jsonb
#  gas_type                    :integer          default("off")
#  position                    :integer
#  reference                   :boolean
#  show_label                  :boolean          default(FALSE), not null
#  type                        :string
#  waste                       :boolean          default(FALSE)
#  weight_percentage           :float
#  weight_percentage_reference :boolean          default(FALSE)
#  created_at                  :datetime
#  updated_at                  :datetime
#  reaction_id                 :integer
#  sample_id                   :integer
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
  belongs_to :sample, -> { includes %i[molecule residues] }, optional: true

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
    eq = equivalent
    eq && !eq.nan? ? "#{(eq * 100).round} %" : '0 %'
  end
end

class ReactionsIntermediateSample < ReactionsSample
  scope :visible, -> { joins(:sample).merge(Sample.visible) }

  belongs_to :reaction_process_activity, class_name: 'ReactionProcessEditor::ReactionProcessActivity', optional: true

  delegate :reaction_process_step, to: :reaction_process_activity, allow_nil: true

  include Reactable
  include Tagging
end
