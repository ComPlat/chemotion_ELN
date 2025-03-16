# frozen_string_literal: true

class PostTranslationalModification < ApplicationRecord
  has_many :sequence_based_macromolecules
end
