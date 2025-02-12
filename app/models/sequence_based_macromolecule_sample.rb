# frozen_string_literal: true

class SequenceBasedMacromoleculeSample < ApplicationRecord
  acts_as_paranoid

  has_many :collections_sequence_based_macromolecule_samples, inverse_of: :sequence_based_macromolecule_sample, dependent: :destroy
  has_many :collections, through: :collections_sequence_based_macromolecule_samples
  belongs_to :sequence_based_macromolecule

end
