# frozen_string_literal: true

# == Schema Information
#
# Table name: predictions
#
#  id               :integer          not null, primary key
#  predictable_id   :integer
#  predictable_type :string
#  decision         :jsonb            not null
#  created_at       :datetime
#  updated_at       :datetime
#
# Indexes
#
#  index_predictions_on_decision                             (decision) USING gin
#  index_predictions_on_predictable_type_and_predictable_id  (predictable_type,predictable_id)
#


# Prediction model
class Prediction < ActiveRecord::Base
  belongs_to :predictable, polymorphic: true
end
