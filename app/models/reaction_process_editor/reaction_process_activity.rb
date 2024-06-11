# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_process_activities
#
#  id                         :uuid             not null, primary key
#  reaction_process_step_id   :uuid
#  activity_name              :string
#  position                   :integer
#  workup                     :json
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  deleted_at                 :datetime
#  reaction_process_vessel_id :uuid
#
module ReactionProcessEditor
  class ReactionProcessActivity < ApplicationRecord
    acts_as_paranoid

    belongs_to :reaction_process_step
    belongs_to :reaction_process_vessel, optional: true

    validate :validate_workup

    delegate :reaction, :reaction_process, :creator, to: :reaction_process_step

    def siblings
      reaction_process_step.reaction_process_activities.order(:position)
    end

    def condition?
      %w[CONDITION].include?(activity_name)
    end

    def adds_sample?
      %w[ADD TRANSFER].include?(activity_name)
    end

    def medium
      return unless medium?

      Medium::Medium.find_by(id: workup['sample_id'])
    end

    def sample
      return unless sample?

      Sample.find_by(id: workup['sample_id'])
    end

    def sample?
      acts_as_sample? && workup['sample_id'].present?
    end

    def medium?
      acts_as_medium? && workup['sample_id'].present?
    end

    def acts_as_sample?
      !acts_as_medium?
    end

    def acts_as_medium?
      # These are the 4 subclasses stored in the STI table `media`
      %w[ADDITIVE MEDIUM DIVERSE_SOLVENT MODIFIER].include?(workup['acts_as'])
    end

    private

    def validate_workup
      validate_workup_sample if %w[ADD SAVE].include?(activity_name)
    end

    def validate_workup_sample
      errors.add(:workup, 'Missing Sample') if workup['sample_id'].blank?
    end
  end
end
