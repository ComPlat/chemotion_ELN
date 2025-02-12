# frozen_string_literal: true

class SequenceBasedMacromolecule < ApplicationRecord
  acts_as_paranoid
  has_many :sequence_based_macromolecule_samples
  has_many :collections, through: :sequence_based_macromolecule_samples
end
