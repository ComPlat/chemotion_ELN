module Usecases
  module Sharing
    class TakeOwnership
      def initialize(params)
        @params = params
      end

      def execute!
        if @params[:is_sync]
          new_owner_id = @params[:current_user_id]
          sc = SyncCollectionsUser.find(@params[:id])
          # if user already owns the (unshared) collection, there is nothing to do here
          return if (sc.shared_by_id == new_owner_id)

          c = Collection.find(sc.collection_id)
          previous_owner_id = sc.shared_by_id
          root_label = "with %s" % User.find(previous_owner_id).name_abbreviation
          root_collection_attributes = {
            label: root_label,
            user_id: previous_owner_id,
            shared_by_id: new_owner_id,
            is_locked: true,
            is_shared: true
          }

          ActiveRecord::Base.transaction do
            c.update(user_id: new_owner_id, ancestry: nil)
            rc = Collection.find_or_create_by(root_collection_attributes)
            sc.update(user_id: previous_owner_id , shared_by_id: new_owner_id,fake_ancestry: rc.id.to_s)
          end

        else
          c = Collection.find(@params[:id])
          # if user already owns the (unshared) collection, there is nothing to do here
          return if (c.user_id == @params[:current_user_id]) && (c.is_shared == false)

          sample_ids = c.samples.pluck(:id)
          reaction_ids = c.reactions.pluck(:id)
          wellplate_ids = c.wellplates.pluck(:id)
          screen_ids = c.screens.pluck(:id)

          owner = User.find(c.shared_by_id)
          owner_collections = owner.collections
          owner_sample_collections = owner_collections.includes(:samples).where('samples.id IN (?)', sample_ids).references(:samples)
          owner_reaction_collections = owner_collections.includes(:reactions).where('reactions.id IN (?)', reaction_ids).references(:reacions)
          owner_wellplate_collections = owner_collections.includes(:wellplates).where('wellplates.id IN (?)', wellplate_ids).references(:wellplates)
          owner_screen_collections = owner_collections.includes(:screens).where('screens.id IN (?)', screen_ids).references(:screens)

          ActiveRecord::Base.transaction do
            c.update(is_shared: false, parent: nil, shared_by_id: nil)

          # delete all associations of former_owner to elements included in c
            CollectionsSample.where('sample_id IN (?) AND collection_id IN (?)', sample_ids, owner_sample_collections.pluck(:id)).delete_all
            CollectionsReaction.where('reaction_id IN (?) AND collection_id IN (?)', reaction_ids, owner_reaction_collections.pluck(:id)).delete_all
            CollectionsWellplate.where('wellplate_id IN (?) AND collection_id IN (?)', wellplate_ids, owner_wellplate_collections.pluck(:id)).delete_all
            CollectionsScreen.where('screen_id IN (?) AND collection_id IN (?)', screen_ids, owner_screen_collections.pluck(:id)).delete_all
          end
        end
      end
    end
  end
end
