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

    before_save :assert_position

    belongs_to :reaction_process_step
    belongs_to :reaction_process_vessel, optional: true

    has_one :reactions_intermediate_sample, dependent: :nullify

    validate :validate_workup

    delegate :reaction, :reaction_process, :creator, to: :reaction_process_step

    def siblings
      reaction_process_step.reaction_process_activities.order(:position)
    end

    def saves_sample?
      %w[SAVE].include?(activity_name)
    end

    def transfer?
      %w[TRANSFER].include?(activity_name)
    end

    def condition?
      %w[CONDITION].include?(activity_name)
    end

    def adds_compound?
      %w[ADD TRANSFER].include?(activity_name) && compound
    end

    def carries_no_compound?
      %w[REMOVE EVAPORATION DISCARD].include?(activity_name)
    end

    def carries_compound?
      !carries_no_compound?
    end

    def halts_automation?
      %w[HALT AUTOMATION_RESPONDED HALT_RESOLVED_NEEDS_CONFIRMATION].include?(workup['AUTOMATION_STATUS'])
    end

    def automation_completed?
      workup['AUTOMATION_STATUS'] == 'COMPLETED'
    end

    def compound
      sample || medium
    end

    def medium
      return unless acts_as_medium?

      Medium::Medium.find_by(id: workup['sample_id'])
    end

    def sample
      return unless acts_as_sample?

      Sample.find_by(id: workup['sample_id'])
    end

    def acts_as_sample?
      carries_compound? && !acts_as_medium?
    end

    def acts_as_medium?
      carries_compound? &&
        %w[ADDITIVE MEDIUM DIVERSE_SOLVENT MODIFIER].include?(workup['acts_as'])
    end

    private

    def validate_workup
      validate_workup_sample if %w[ADD SAVE].include?(activity_name)
    end

    def validate_workup_sample
      errors.add(:workup, 'Missing Sample') if workup['sample_id'].blank?
    end

    def assert_position
      self.position ||= siblings.count
    end
  end
end
