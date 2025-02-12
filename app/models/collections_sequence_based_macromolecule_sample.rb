# frozen_string_literal: true

class CollectionsSequenceBasedMacromoleculeSample < ApplicationRecord
  acts_as_paranoid
  belongs_to :collection
  belongs_to :sequence_based_macromolecule_sample
  validates :collection, :sequence_based_macromolecule_sample, presence: true

  include Tagging
  include Collecting

  # TODO: implement methods from CollectionsSample
end
