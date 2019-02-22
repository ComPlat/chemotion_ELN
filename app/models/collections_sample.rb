class CollectionsSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :sample
  validates :collection, :sample, presence: true

  include Tagging
  include Collecting

  def self.remove_in_collection(element_ids, collection_ids)
    # Remove from collections
    delete_in_collection_with_filter(element_ids, collection_ids)
    # update sample tag with collection info
    update_tag_by_element_ids(element_ids)
  end

  # prevent removing sample from a collection if associated wellplate or reaction is present
  def self.delete_in_collection_with_filter(sample_ids, collection_ids)
    [collection_ids].flatten.each do |cid|
      next unless cid.is_a?(Integer)
      # TODO: sql function
      # from a collection, select sample_ids with neither wellplate nor reaction associated
      ids = CollectionsSample.joins(
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
      ).where(
        "collections_samples.collection_id = #{cid} and collections_samples.sample_id in (?) and cw.id isnull and cr.id isnull",
        sample_ids
      ).pluck(:sample_id)
      delete_in_collection(ids, cid)
    end
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
