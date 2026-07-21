# == Schema Information
#
# Table name: collections_samples
#
#  id            :integer          not null, primary key
#  collection_id :integer
#  sample_id     :integer
#  deleted_at    :datetime
#
# Indexes
#
#  index_collections_samples_on_collection_id                (collection_id)
#  index_collections_samples_on_deleted_at                   (deleted_at)
#  index_collections_samples_on_sample_id_and_collection_id  (sample_id,collection_id) UNIQUE
#

class CollectionsSample < ApplicationRecord
  acts_as_paranoid
  belongs_to :collection
  belongs_to :sample
  validates :collection, :sample, presence: true

  include Tagging
  include Collecting

  def self.remove_in_collection(element_ids, collection_ids)
    # Remove from collections; returns the ids kept back because they are still linked to a
    # reaction or wellplate in the collection (see delete_in_collection_with_filter).
    locked_ids = delete_in_collection_with_filter(element_ids, collection_ids)
    # update sample tag with collection info
    update_tag_by_element_ids(element_ids)
    locked_ids
  end

  # Removes each sample from the collection unless it is still linked to a reaction or wellplate
  # that is also in that collection. Returns the ids of the samples that were kept for that reason:
  # they cannot be removed/deleted on their own, the reaction or wellplate has to be removed instead.
  def self.delete_in_collection_with_filter(sample_ids, collection_ids)
    locked_sample_ids = []
    [collection_ids].flatten.each do |cid|
      next unless cid.is_a?(Integer)

      # from a collection, join each requested sample to any reaction/wellplate it belongs to there
      # TODO: sql function
      associated = CollectionsSample.joins(
        <<~SQL
          left join reactions_samples rs
          on rs.sample_id = collections_samples.sample_id and rs.deleted_at isnull
          left join collections_reactions cr
          on cr.collection_id = #{cid} and cr.reaction_id = rs.reaction_id and cr.deleted_at is null
          left join wells w
          on w.sample_id = collections_samples.sample_id and w.deleted_at isnull
          left join collections_wellplates cw
          on cw.collection_id = #{cid} and cw.wellplate_id = w.wellplate_id and cw.deleted_at is null
        SQL
      ).where('collections_samples.collection_id = ? and collections_samples.sample_id in (?)', cid, sample_ids)

      # samples with neither wellplate nor reaction are removable; the rest (present but not
      # removable) are kept -> reported as locked so the UI can explain why nothing happened
      present_ids = associated.distinct.pluck(:sample_id)
      deletable_ids = associated.where('cw.id isnull and cr.id isnull').distinct.pluck(:sample_id)
      delete_in_collection(deletable_ids, cid)
      locked_sample_ids |= (present_ids - deletable_ids)
    end
    locked_sample_ids
  end

  def self.create_in_collection(element_ids, collection_ids)
    # upsert in target collection
    # update sample tag with collection info
    static_create_in_collection(element_ids, collection_ids)
  end

  def self.move_to_collection(element_ids, from_col_ids, to_col_ids)
    # Delete in collection
    delete_in_collection_with_filter(element_ids, from_col_ids)
    # Upsert in target collection
    insert_in_collection(element_ids, to_col_ids)
    # Update element tag with collection info
    update_tag_by_element_ids(element_ids)
  end
end
