# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_process_steps
#
#  id                         :uuid             not null, primary key
#  reaction_process_id        :uuid
#  reaction_process_vessel_id :uuid
#  name                       :string
#  position                   :integer
#  locked                     :boolean
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  deleted_at                 :datetime
#
module ReactionProcessEditor
  class ReactionProcessStep < ApplicationRecord
    acts_as_paranoid

    belongs_to :reaction_process

    belongs_to :reaction_process_vessel, optional: true

    has_many :reaction_process_activities, dependent: :destroy

    delegate :reaction, :creator, to: :reaction_process

    def siblings
      reaction_process.reaction_process_steps.order(:position)
    end

    def predecessors
      siblings.where(position: 0...position)
    end

    def duration
      reaction_process_activities.reduce(0) { |sum, activity| sum + activity.workup['duration'].to_i }
    end

    def label
      "#{step_number}/#{reaction_process.reaction_process_steps.count} #{name}"
    end

    def step_number
      position + 1
    end

    def halts_automation?
      reaction_process_activities.any?(&:halts_automation?)
    end

    def step_automation_status
      # step_automation_status mostly determined by external conditions
      # can be set to "STEP_MANUAL_PROCEED" / "STEP_HALT_BY_PRECEDING" as fallback if no other condition fullfilled.
      return 'STEP_COMPLETED' if reaction_process_activities.all?(&:automation_completed?)
      return 'STEP_CAN_RUN' if predecessors.none?(&:halts_automation?)

      automation_status || 'STEP_HALT_BY_PRECEDING'
    end

    # We assemble an Array of activity_preconditions which the ReactionActionEntity then indexes by its position.
    def activity_preconditions
      @activity_preconditions ||= [reaction_process.initial_conditions] + calculate_activity_post_conditions
    end

    def final_conditions
      @final_conditions ||= activity_preconditions.last
    end

    def added_materials(material_type)
      case material_type
      when 'ADDITIVE'
        Medium::Additive.find added_material_ids(material_type)
      when 'DIVERSE_SOLVENT'
        Medium::DiverseSolvent.find added_material_ids(material_type)
      when 'MEDIUM'
        Medium::Medium.find added_material_ids(material_type)
      when 'SOLVENT'
        Sample.find added_material_ids(material_type)
      else
        Medium::Medium.find added_material_ids(material_type)
        []
      end
    end

    def added_material_ids(material_type)
      activities_adding_sample_acting_as(material_type).map { |activity| activity.workup['sample_id'] }
    end

    def saved_sample_ids
      reaction_process_activities.filter_map do |activity|
        activity.saves_sample? && activity.workup['sample_id']
      end
    end

    def mounted_equipment
      @mounted_equipment ||= reaction_process_activities.map do |action|
        if action.condition?
          action.workup && action.workup['EQUIPMENT'].try(:[], 'value')
        else
          action.workup && action.workup['equipment']
        end
      end.flatten.uniq.compact
    end

    private

    def activities_adding_sample_acting_as(material_type)
      reaction_process_activities
        .select(&:adds_compound?)
        .select do |activity|
        activity.workup['acts_as'] == material_type
      end
    end

    def calculate_activity_post_conditions
      current_conditions = reaction_process.initial_conditions

      reaction_process_activities.order(:position).map do |activity|
        if activity.condition?
          current_conditions.each do |key, current_condition|
            current_conditions[key] = activity.workup[key] || current_condition || {}
          end
        end
        current_conditions.dup
      end
    end
  end
end
