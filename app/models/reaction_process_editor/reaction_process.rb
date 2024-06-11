# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_processes
#
#  id                 :uuid             not null, primary key
#  reaction_id        :integer
#  default_conditions :jsonb
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  deleted_at         :datetime
#

module ReactionProcessEditor
  class ReactionProcess < ApplicationRecord
    acts_as_paranoid

    belongs_to :reaction, optional: false

    has_one :provenance, dependent: :destroy

    has_many :reaction_process_steps, dependent: :destroy
    has_many :samples_preparations, dependent: :destroy

    has_many :reaction_process_vessels, dependent: :destroy
    has_many :vessels, through: :reaction_process_vessels

    delegate :creator, :reaction_svg_file, :short_label, :collections, to: :reaction

    def user_default_conditions
      creator.reaction_process_defaults&.default_conditions.to_h
    end

    def reaction_default_conditions
      default_conditions.to_h
    end

    def initial_conditions
      Entities::ReactionProcessEditor::SelectOptions::Conditions::GLOBAL_DEFAULTS
        .merge(user_default_conditions)
        .merge(reaction_default_conditions)
    end

    def saved_sample_ids
      reaction_process_steps.includes([:reaction_process_activities]).map(&:saved_sample_ids).flatten.uniq
    end
  end
end
