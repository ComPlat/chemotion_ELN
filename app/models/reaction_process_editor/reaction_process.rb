# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_processes
#
#  id                 :uuid             not null, primary key
#  automation_ordinal :integer
#  default_conditions :jsonb
#  deleted_at         :datetime
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  reaction_id        :integer
#

module ReactionProcessEditor
  class ReactionProcess < ApplicationRecord
    acts_as_paranoid

    belongs_to :reaction, optional: false

    has_one :provenance, dependent: :destroy

    has_many :reaction_process_steps, dependent: :destroy
    has_many :samples_preparations, dependent: :destroy

    has_many :reaction_process_vessels, dependent: :destroy

    delegate :creator, :reaction_svg_file, :short_label, :collections, to: :reaction

    def user_default_conditions
      creator.reaction_process_defaults&.default_conditions.to_h
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
  end
end
