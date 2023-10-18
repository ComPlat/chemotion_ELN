# frozen_string_literal: true

class CelllineMaterial < ApplicationRecord
  acts_as_paranoid

  has_many :literals, as: :element, dependent: :destroy
  has_many :literatures, through: :literals
end
