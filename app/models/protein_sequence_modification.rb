# frozen_string_literal: true

class ProteinSequenceModification < ApplicationRecord
  has_many :sequence_based_macromolecules
end
