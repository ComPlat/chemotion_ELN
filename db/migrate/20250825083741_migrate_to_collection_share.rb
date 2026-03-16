class MigrateToCollectionShare < ActiveRecord::Migration[6.1]
  # SyncCollectionsUser was deleted, but the data migration still needs the model class, so we define it here
  # to be able to use its ActiveRecord interface
  if !defined?(SyncCollectionsUser)
      class SyncCollectionsUser < ApplicationRecord
        belongs_to :collection
      end
  end

  def up
    Collection.where.not(shared_by_id: nil).find_each do |collection|
      CollectionShare.create(
        collection: collection,
        shared_with_id: collection.user_id,
        permission_level: collection.permission_level,
        celllinesample_detail_level: collection.celllinesample_detail_level || 10,
        devicedescription_detail_level: collection.devicedescription_detail_level || 10,
        element_detail_level: collection.element_detail_level || 10,
        reaction_detail_level: collection.reaction_detail_level || 10,
        researchplan_detail_level: collection.researchplan_detail_level || 10,
        sample_detail_level: collection.sample_detail_level || 10,
        screen_detail_level: collection.screen_detail_level || 10,
        sequencebasedmacromoleculesample_detail_level: collection.try(:sequencebasedmacromoleculesample_detail_level) || 10,
        wellplate_detail_level: collection.wellplate_detail_level || 10
      )
      collection.update(user_id: collection.shared_by_id, shared_by_id: nil, shared: true)
    end

    SyncCollectionsUser.find_each do |scu|
      CollectionShare.create(
        collection_id: scu.collection_id,
        shared_with_id: scu.user_id,
        permission_level: scu.permission_level,
        celllinesample_detail_level: scu.celllinesample_detail_level || 10,
        devicedescription_detail_level: scu.devicedescription_detail_level || 10,
        element_detail_level: scu.element_detail_level || 10,
        reaction_detail_level: scu.reaction_detail_level || 10,
        researchplan_detail_level: scu.researchplan_detail_level || 10,
        sample_detail_level: scu.sample_detail_level || 10,
        screen_detail_level: scu.screen_detail_level || 10,
        sequencebasedmacromoleculesample_detail_level: scu.try(:sequencebasedmacromoleculesample_detail_level) || 10,
        wellplate_detail_level: scu.wellplate_detail_level || 10
      )
      scu.collection.update(shared: true) unless scu.collection.shared?
    end
  end
end
