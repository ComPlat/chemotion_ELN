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
    # Remove from collections
    error_message = delete_in_collection_with_filter(element_ids, collection_ids)
    return error_message unless error_message.nil?

    # update sample tag with collection info
    update_tag_by_element_ids(element_ids)
  end

  # prevent removing sample from a collection if associated wellplate or reaction is present
  def self.delete_in_collection_with_filter(sample_ids, collection_ids)
    [collection_ids].flatten.each do |cid|
      next unless cid.is_a?(Integer)
      # TODO: sql function
      # from a collection, select sample_ids with neither wellplate nor reaction associated
      sample_reaction_ids = fetch_sample_ids('reaction', 'reactions_samples', cid, sample_ids)
      message = generate_error_message('reaction') if sample_reaction_ids.empty?
      return message unless message.nil?

      sample_wellplate_ids = fetch_sample_ids('wellplate', 'wells', cid, sample_ids)
      message = generate_error_message('wellplate') if sample_wellplate_ids.empty?
      return message unless message.nil?

      ids = sample_wellplate_ids + sample_reaction_ids
      delete_in_collection(ids, cid)
    end
  end

  def self.fetch_sample_ids(elementKlass, element, cid, sample_ids)
    CollectionsSample.joins(
      <<~SQL
        left join #{element} el
        on el.sample_id = collections_samples.sample_id and el.deleted_at is null
        left join collections_#{elementKlass}s c
        on c.collection_id = #{cid} and c.#{elementKlass}_id = el.#{elementKlass}_id and c.deleted_at is null
      SQL
      ).where(
        "collections_samples.collection_id = #{cid} and collections_samples.sample_id in (?) and c.id is null",
        sample_ids
      ).pluck(:sample_id)
  end

  def self.generate_error_message element
    { error: "Sample cannot be deleted due to associated #{element}." }
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
