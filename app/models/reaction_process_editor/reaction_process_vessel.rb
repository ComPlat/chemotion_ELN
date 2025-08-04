# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_process_vessels
#
#  id                  :uuid             not null, primary key
#  deleted_at          :datetime
#  preparations        :string           default([]), is an Array
#  vesselable_type     :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  reaction_process_id :uuid
#  vesselable_id       :uuid
#
module ReactionProcessEditor
  class ReactionProcessVessel < ApplicationRecord
    acts_as_paranoid

    belongs_to :reaction_process
    belongs_to :vesselable, polymorphic: true
    has_many :reaction_process_steps, dependent: :nullify

    delegate :creator, to: :reaction_process
  end
end
