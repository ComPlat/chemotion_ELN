# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_process_activities
#
#  id                         :uuid             not null, primary key
#  activity_name              :string
#  automation_ordinal         :integer
#  automation_response        :jsonb
#  deleted_at                 :datetime
#  position                   :integer
#  workup                     :json
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  reaction_process_step_id   :uuid
#  reaction_process_vessel_id :uuid
#
module ReactionProcessEditor
  class ReactionProcessActivity < ApplicationRecord
    acts_as_paranoid

    before_save :assert_position

    belongs_to :reaction_process_step
    belongs_to :reaction_process_vessel, optional: true

    has_one :reactions_intermediate_sample, dependent: :nullify
    has_many :fractions,
             class_name: 'ReactionProcessEditor::Fraction',
             inverse_of: :parent_activity,
             foreign_key: :parent_activity_id,
             dependent: :destroy

    has_one :consumed_fraction,
            class_name: 'ReactionProcessEditor::Fraction',
            inverse_of: :consuming_activity,
            foreign_key: :consuming_activity_id,
            dependent: :nullify

    validate :validate_workup

    delegate :reaction, :reaction_process, :creator, to: :reaction_process_step

    def siblings
      reaction_process_step.reaction_process_activities.order(:position)
    end

    def saves_sample?
      %w[SAVE].include?(activity_name)
    end

    def remove?
      %w[REMOVE].include?(activity_name)
    end

    def transfer?(sample_id: nil)
      %w[TRANSFER].include?(activity_name) &&
        (sample_id.nil? || workup['sample_id'] == sample_id)
    end

    def condition?
      %w[CONDITION].include?(activity_name)
    end

    def adds_compound?
      %w[ADD TRANSFER].include?(activity_name) && compound
    end

    def removes_compound?
      %w[REMOVE EVAPORATION DISCARD].include?(activity_name)
    end

    def carries_compound?
      !removes_compound?
    end

    def compound
      sample || medium
    end

    def medium
      return unless carries_medium?

      Medium::Medium.find_by(id: workup['sample_id'])
    end

    def sample
      return unless carries_sample?

      Sample.find_by(id: workup['sample_id'])
    end

    def carries_sample?
      carries_compound? && !carries_medium?
    end

    def carries_medium?
      carries_compound? &&
        %w[ADDITIVE MEDIUM DIVERSE_SOLVENT MODIFIER].include?(workup['acts_as'])
    end

    private

    def validate_workup
      validate_workup_sample if %w[SAVE].include?(activity_name)
    end

    def validate_workup_sample
      errors.add(:workup, 'Missing Sample') if workup['sample_id'].blank?
    end

    def assert_position
      self.position ||= siblings.count
    end
  end
end
