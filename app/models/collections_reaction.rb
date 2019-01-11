class CollectionsReaction < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :reaction

  include Tagging

  def self.move_to_collection(reaction_ids, old_col_id, new_col_id)
    # Get associated: starting_materials, reactants, and product samples
    sample_ids = Reaction.get_associated_samples(reaction_ids)

    # Delete reactions in old collection
    self.delete_in_collection(reaction_ids, old_col_id)

    # Move associated samples in current collection
    CollectionsSample.move_to_collection(sample_ids, old_col_id, new_col_id)

    # Create new reations in target collection
    self.static_create_in_collection(reaction_ids, new_col_id)
  end

  # Static delete without checking associated
  def self.delete_in_collection(reaction_ids, collection_id)
    self.where(
      reaction_id: reaction_ids,
      collection_id: collection_id
    ).destroy_all
  end

  # Remove from collection and process associated elements
  def self.remove_in_collection(reaction_ids, collection_id)
    self.delete_in_collection(reaction_ids, collection_id)
    sample_ids = Reaction.get_associated_samples(reaction_ids)

    CollectionsSample.remove_in_collection(sample_ids, collection_id)
  end

  # Static create without checking associated
  def self.static_create_in_collection(reaction_ids, collection_id)
    reaction_ids.map { |id|
      r = self.with_deleted.find_or_create_by(
        reaction_id: id,
        collection_id: collection_id
      )

      r.restore! if r.deleted?
      r
    }
  end

  def self.create_in_collection(reaction_ids, collection_id)
    # Get associated: starting_materials, reactants, and product samples
    sample_ids = Reaction.get_associated_samples(reaction_ids)
    # Create associated samples in collection
    CollectionsSample.create_in_collection(sample_ids, collection_id)
    # Create new reaction in collection
    self.static_create_in_collection(reaction_ids, collection_id)
  end
end
