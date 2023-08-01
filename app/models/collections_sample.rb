# frozen_string_literal: true

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

  ASSOCIATIONS = %w[reaction wellplate].freeze

  def self.remove_in_collection(element_ids, collection_ids)
    # Remove from collections
    delete_flag = delete_in_collection_with_filter(element_ids, collection_ids)
    return delete_flag if ASSOCIATIONS.include?(delete_flag)

    # update sample tag with collection info
    update_tag_by_element_ids(element_ids)
  end

  # prevent removing sample from a collection if associated wellplate or reaction is present
  def self.delete_in_collection_with_filter(sample_ids, collection_ids)
    [collection_ids].flatten.each do |cid|
      next unless cid.is_a?(Integer)

      # TODO: sql function
      # from a collection, select sample_ids with neither wellplate nor reaction associated
      sample_reaction_ids = sample_ids('reactions_samples', ASSOCIATIONS[0], cid, sample_ids)
      return ASSOCIATIONS[0] if sample_reaction_ids.empty?

      sample_well_ids = sample_ids('wells', ASSOCIATIONS[1], cid, sample_ids)
      return ASSOCIATIONS[1] if sample_well_ids.empty?

      ids = sample_reaction_ids & sample_well_ids
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

  def self.sample_ids(join_class, element, cid, sample_ids)
    CollectionsSample.joins(
      <<~SQL.squish
        left join #{join_class} record
        on record.sample_id = collections_samples.sample_id and record.deleted_at is null
        left join collections_#{element}s c
        on c.collection_id = #{cid} and c.#{element}_id = record.#{element}_id and c.deleted_at is null
      SQL
    ).where(
      "collections_samples.collection_id = #{cid} and collections_samples.sample_id in (?) and c.id is null", sample_ids
    ).pluck(:sample_id)
  end
end
