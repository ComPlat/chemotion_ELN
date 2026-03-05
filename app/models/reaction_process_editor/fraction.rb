# frozen_string_literal: true

# == Schema Information
#
# Table name: fractions
#
#  id                  :uuid             not null, primary key
#  position            :integer
#  vials               :string           default([]), is an Array
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  consuming_action_id :uuid
#  parent_action_id    :uuid
#
module ReactionProcessEditor
  class Fraction < ApplicationRecord
    belongs_to :parent_action, class_name: '::ReactionProcessEditor::ReactionProcessActivity',
                               inverse_of: :fractions
    belongs_to :consuming_action, class_name: '::ReactionProcessEditor::ReactionProcessActivity', optional: true,
                                  dependent: :destroy, inverse_of: :consumed_fraction
  end
end
