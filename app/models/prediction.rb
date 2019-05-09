# frozen_string_literal: true

# Prediction model
class Prediction < ActiveRecord::Base
  belongs_to :predictable, polymorphic: true
end
