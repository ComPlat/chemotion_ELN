# frozen_string_literal: true

module ReactionProcessEditor
  class Fraction < ApplicationRecord
    belongs_to :parent_activity, class_name: '::ReactionProcessEditor::ReactionProcessActivity',
                                 inverse_of: :fractions
    belongs_to :consuming_activity, class_name: '::ReactionProcessEditor::ReactionProcessActivity', optional: true,
                                    dependent: :destroy, inverse_of: :consumed_fraction
  end
end
