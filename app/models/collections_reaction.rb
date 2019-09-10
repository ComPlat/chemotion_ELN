# == Schema Information
#
# Table name: collections_reactions
#
#  id            :integer          not null, primary key
#  collection_id :integer
#  reaction_id   :integer
#  deleted_at    :datetime
#
# Indexes
#
#  index_collections_reactions_on_collection_id                  (collection_id)
#  index_collections_reactions_on_deleted_at                     (deleted_at)
#  index_collections_reactions_on_reaction_id_and_collection_id  (reaction_id,collection_id) UNIQUE
#

class CollectionsReaction < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :reaction

  include Tagging
  include Collecting

  # Remove from collection and process associated elements (and update collection info tag)
  def self.remove_in_collection(reaction_ids, collection_ids)
    # Get associated samples
    sample_ids = Reaction.get_associated_samples(reaction_ids)
    # Delete in collection
    delete_in_collection(reaction_ids, collection_ids)
    # Update element tag with collection info
    update_tag_by_element_ids(reaction_ids)
    # Delete associated in collection and update tag
    CollectionsSample.remove_in_collection(sample_ids, collection_ids)
  end

  def self.move_to_collection(reaction_ids, from_col_ids, to_col_ids)
    # Get associated samples
    sample_ids = Reaction.get_associated_samples(reaction_ids)
    # Delete reactions from collection
    delete_in_collection(reaction_ids, from_col_ids)
    # Move associated samples in current collection
    CollectionsSample.move_to_collection(sample_ids, from_col_ids, to_col_ids)
    # Associate reactions to collections (and update collection info tag)
    static_create_in_collection(reaction_ids, to_col_ids)
  end

  def self.create_in_collection(reaction_ids, collection_ids)
    # Get associated: starting_materials, reactants, and product samples
    sample_ids = Reaction.get_associated_samples(reaction_ids)
    # Create associated samples in collection
    CollectionsSample.create_in_collection(sample_ids, collection_ids)
    # Associate reactions to collections
    static_create_in_collection(reaction_ids, collection_ids)
  end
end
