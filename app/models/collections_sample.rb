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
    error_message = delete_in_collection_without_association(element_ids, collection_ids)
    return error_message unless error_message.nil?

    # update sample tag with collection info
    update_tag_by_element_ids(element_ids)
  end

  # prevent removing sample from a collection if associated wellplate or reaction is present
  def self.delete_in_collection_without_association(sample_ids, collection_ids)
    [collection_ids].flatten.each do |cid|
      next unless cid.is_a?(Integer)
      # TODO: sql function
      # from a collection, select sample_ids with neither wellplate nor reaction associated
      sample_reaction_ids = fetch_sample_ids('reaction', 'reactions_samples', cid, sample_ids)
      associated_sample_ids = sample_ids - sample_reaction_ids
      message = generate_error_message(associated_sample_ids, 'reaction') if associated_sample_ids.present?
      return message unless message.nil?

      sample_wellplate_ids = fetch_sample_ids('wellplate', 'wells', cid, sample_ids)
      associated_sample_ids = sample_ids - sample_wellplate_ids
      message = generate_error_message(associated_sample_ids, 'wellplate') if associated_sample_ids.present?

      return message unless message.nil?

      ids = sample_wellplate_ids + sample_reaction_ids
      delete_in_collection(ids, cid)
    end
  end

  def self.fetch_sample_ids(element_class, element, cid, sample_ids)
    CollectionsSample.joins(
      <<~SQL
        left join #{element} el
        on el.sample_id = collections_samples.sample_id and el.deleted_at is null
        left join collections_#{element_class}s c
        on c.collection_id = #{cid} and c.#{element_class}_id = el.#{element_class}_id and c.deleted_at is null
      SQL
      ).where(
        "collections_samples.collection_id = #{cid} and collections_samples.sample_id in (?) and c.id is null",
        sample_ids
      ).pluck(:sample_id)
  end

  def self.generate_error_message(sample_ids, element)
    labels = Sample.where(id: sample_ids).pluck(:short_label)
    if labels.count > 3
      labels = labels.first(3)
      labels << '...'
    end

    { error: "Some samples #{labels} cannot be removed because they are part of a #{element}.\n
              Delete the associated #{element}s or remove the samples from the #{element}s."
    }
  end

  def self.create_in_collection(element_ids, collection_ids)
    # upsert in target collection
    # update sample tag with collection info
    static_create_in_collection(element_ids, collection_ids)
  end

  def self.move_to_collection(element_ids, from_col_ids, to_col_ids)
    # Delete in collection
    delete_in_collection_without_association(element_ids, from_col_ids)
    # Upsert in target collection
    insert_in_collection(element_ids, to_col_ids)
    # Update element tag with collection info
    update_tag_by_element_ids(element_ids)
  end
end
