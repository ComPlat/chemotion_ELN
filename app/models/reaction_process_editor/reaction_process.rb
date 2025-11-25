# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_processes
#
#  id                         :uuid             not null, primary key
#  automation_ordinal         :integer
#  default_conditions         :jsonb
#  deleted_at                 :datetime
#  sample_setup               :jsonb
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  reaction_id                :integer
#  reaction_process_vessel_id :uuid
#  sample_id                  :integer
#  user_id                    :integer
#

module ReactionProcessEditor
  class ReactionProcess < ApplicationRecord
    acts_as_paranoid

    belongs_to :user
    belongs_to :reaction, optional: true
    belongs_to :sample, optional: true

    has_one :provenance, dependent: :destroy

    has_many :reaction_process_steps, dependent: :destroy
    has_many :samples_preparations, dependent: :destroy

    has_many :reaction_process_vessels, dependent: :destroy

    # relevant as SampleSetup only for sample processes (="no-reaction process"). If one day SampleSetup gets extended
    #  we might want to introduce a separate model SampleSetup which then carries this reaction_process_vessel.
    belongs_to :reaction_process_vessel, optional: true

    delegate :reaction_svg_file, :short_label, :collections, to: :reaction, allow_nil: true

    before_save :set_initial_automation_ordinal

    def creator
      user || sample&.creator || reaction&.creator
    end

    def sample_reaction
      sample&.reactions&.first
    end

    def user_default_conditions
      creator&.reaction_process_defaults&.default_conditions.to_h
    end

    def reaction_default_conditions
      default_conditions.to_h
    end

    def initial_conditions
      Entities::ReactionProcessEditor::SelectOptions::Forms::Condition::GLOBAL_DEFAULTS
        .merge(user_default_conditions)
        .merge(reaction_default_conditions)
    end

    def saved_sample_ids
      reaction_process_steps.includes([:reaction_process_activities]).map(&:saved_sample_ids).flatten.uniq
    end

    def next_automation_ordinal
      next_ordinal = (automation_ordinal || 0) + 1
      update({ automation_ordinal: next_ordinal })
      next_ordinal
    end

    def set_initial_automation_ordinal
      update({ automation_ordinal: 0 }) unless automation_ordinal
    end

    def ord_filename
      model = reaction || sample

      "#{Time.zone.today.iso8601}-#{model.class}-#{model.id}-#{model.short_label}.kit-ord.json"
    end
  end
end
