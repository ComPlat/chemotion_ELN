class MigrateToCollectionShare < ActiveRecord::Migration[6.1]
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
      collection.update(user_id: collection.shared_by_id, shared_by_id: nil)
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
    end
  end

  def down
    # first do the sync collection share thingies, by checking which collection has more than one share
    # Collection.shared_with_more_than_one_user.find_each do |collection|
    #   SyncCollectionsUser.create(
    #     collection_id: scu.collection_id,
    #     shared_with_id: scu.user_id,
    #     permission_level: scu.permission_level,
    #     celllinesample_detail_level: scu.celllinesample_detail_level,
    #     devicedescription_detail_level: scu.devicedescription_detail_level,
    #     element_detail_level: scu.element_detail_level,
    #     reaction_detail_level: scu.reaction_detail_level,
    #     researchplan_detail_level: scu.researchplan_detail_level,
    #     sample_detail_level: scu.sample_detail_level,
    #     screen_detail_level: scu.screen_detail_level,
    #     sequencebasedmacromoleculesample_detail_level: scu.try(:sequencebasedmacromoleculesample_detail_level),
    #     wellplate_detail_level: scu.wellplate_detail_level

    #   )
    # end
    # then do the shares for collections with only one share

  end
end
