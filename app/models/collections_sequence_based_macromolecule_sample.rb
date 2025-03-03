# frozen_string_literal: true

# == Schema Information
#
# Table name: collections_sequence_based_macromolecule_samples
#
#  id                                     :bigint           not null, primary key
#  deleted_at                             :datetime
#  created_at                             :datetime         not null
#  updated_at                             :datetime         not null
#  collection_id                          :bigint
#  sequence_based_macromolecule_sample_id :bigint
#
# Indexes
#
#  idx_collections_sbmm_sample_collection    (collection_id)
#  idx_collections_sbmm_sample_deleted_at    (deleted_at)
#  idx_collections_sbmm_sample_sample        (sequence_based_macromolecule_sample_id)
#  idx_collections_sbmm_sample_unique_joins  (collection_id,sequence_based_macromolecule_sample_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (collection_id => collections.id)
#  fk_rails_...  (sequence_based_macromolecule_sample_id => sequence_based_macromolecule_samples.id)
#
class CollectionsSequenceBasedMacromoleculeSample < ApplicationRecord
  acts_as_paranoid
  belongs_to :collection
  belongs_to :sequence_based_macromolecule_sample
  validates :collection, :sequence_based_macromolecule_sample, presence: true

  include Tagging
  include Collecting

  # TODO: implement methods from CollectionsSample
end
