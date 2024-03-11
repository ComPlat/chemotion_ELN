# frozen_string_literal: true

module ReactionProcessEditor
  class ReactionProcessVessel < ApplicationRecord
    acts_as_paranoid

    belongs_to :reaction_process
    belongs_to :vessel
    has_many :reaction_process_steps, dependent: :nullify

    delegate :creator, to: :reaction_process
  end
end
