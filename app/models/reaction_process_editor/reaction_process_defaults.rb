# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_process_defaults
#
#  id                 :uuid             not null, primary key
#  user_id            :integer
#  default_conditions :jsonb
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#
module ReactionProcessEditor
  class ReactionProcessDefaults < ApplicationRecord
    belongs_to :user
  end
end
