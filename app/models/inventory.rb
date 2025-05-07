# frozen_string_literal: true

# == Schema Information
#
# Table name: inventories
#
#  id         :bigint           not null, primary key
#  prefix     :string
#  name       :string
#  counter    :integer          default(0)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_inventories_on_prefix  (prefix) UNIQUE
#
class Inventory < ApplicationRecord
  has_many :collections, dependent: :nullify

  scope :by_collection_id, ->(collection_id) { joins(:collections).where(collections: { id: collection_id }) }

  def self.compare_associations(collection_ids)
    inventory_collection_ids = []
    collection_ids.map do |collection_id|
      inventory = Collection.find(collection_id).inventory
      next unless inventory

      ids = inventory.collections.pluck(:id)
      inventory_collection_ids |= ids
    end
    inventory_collection_ids.sort == collection_ids.sort
  end

  def self.update_inventory_label(prefix, name, counter, collection_id)
    collection = Collection.find_by(id: collection_id)
    return nil unless collection

    inventory = collection&.inventory || Inventory.new
    inventory.collections << collection unless inventory.collections.include?(collection)
    inventory['prefix'] = prefix
    inventory['name'] = name
    inventory['counter'] = counter
    inventory.save!
    inventory
  end

  def self.create_or_update_inventory_label(prefix, name, counter, collection_ids, user_id)
    associations = compare_associations(collection_ids)
    ActiveRecord::Base.transaction do
      if associations
        inventory = update_inventory_label(
          prefix,
          name,
          counter,
          collection_ids.first,
        )
      else
        inventory = Inventory.new(prefix: prefix, name: name, counter: counter)
        inventory.save!
      end
      collection_ids.map do |id|
        collection = Collection.find(id)
        collection.update(inventory_id: inventory.id)
      end
      { inventory_collections: Collection.inventory_collections(user_id) }
    end
  end

  def update_incremented_counter
    update(counter: counter + 1)
  end

  def self.fetch_inventories(user_id)
    joins(collections: :user).where(users: { id: user_id })
  end

  # compare the counter of a given label with the current counter+1
  # @param [String] label
  # @return [Boolean]
  def match_inventory_counter(inventory_label)
    # match the integer part of the label at the end of the string after the last '-'
    # with the current counter + 1
    inventory_label.split('-').last.to_i == counter + 1
  end

  def label
    "#{prefix}-#{counter}"
  end
end
