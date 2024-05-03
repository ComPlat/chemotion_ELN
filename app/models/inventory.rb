# frozen_string_literal: true

class Inventory < ApplicationRecord
  has_many :collections, dependent: :nullify

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

  def increment_inventory_label_counter(collection_ids)
    inventory = Collection.find_by(id: collection_ids)&.inventory
    return if inventory.nil? || inventory['counter'].nil?

    inventory['counter'] = inventory['counter'].succ
    inventory.save!
    inventory
  end

  def self.fetch_inventories(user_id)
    joins(collections: :user).where(users: { id: user_id })
  end
end
