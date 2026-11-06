# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_steps
#
#  id              :bigint           not null, primary key
#  conditions      :string
#  deleted_at      :datetime
#  description     :jsonb
#  duration        :string
#  ph_operator     :string           default("="), not null
#  ph_value        :float
#  position        :integer          not null
#  temperature     :jsonb
#  timestamp_start :string
#  timestamp_stop  :string
#  vessel_size     :jsonb
#  volume          :decimal(10, 4)
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  reaction_id     :integer          not null
#
# Indexes
#
#  index_reaction_steps_on_deleted_at   (deleted_at)
#  index_reaction_steps_on_reaction_id  (reaction_id)
#
class ReactionStep < ApplicationRecord
  acts_as_paranoid

  belongs_to :reaction

  validates :position, presence: true, numericality: { greater_than: 0 }

  def reference_row
    previous = reaction.reaction_steps.where(position: ...position).order(:position).last
    return if previous.nil?

    candidates = [
      *ReactionsProductSample.where(reaction_step_id: previous.id, carry_on: true).order(:position),
      *ReactionsStartingMaterialSample.where(reaction_step_id: id).order(:position),
      *ReactionsReactantSample.where(reaction_step_id: id).order(:position),
    ]
    candidates.find(&:step_reference) || candidates.first
  end
end
