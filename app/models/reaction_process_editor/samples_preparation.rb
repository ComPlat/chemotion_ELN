# frozen_string_literal: true

# == Schema Information
#
# Table name: samples_preparations
#
#  id                  :uuid             not null, primary key
#  reaction_process_id :uuid
#  sample_id           :integer
#  preparations        :string           is an Array
#  equipment           :string           is an Array
#  details             :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#

module ReactionProcessEditor
  class SamplesPreparation < ApplicationRecord
    belongs_to :reaction_process
    belongs_to :sample, -> { includes(:molecule) }, inverse_of: :samples_preparations
  end
end
