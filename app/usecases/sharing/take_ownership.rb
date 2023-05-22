# frozen_string_literal: true

module Usecases
  module Sharing
    class TakeOwnership
      def initialize(params)
        @params = params
      end

      def execute!
        acl = CollectionAcl.find_by_id(@params[:id])

        if !acl.nil?
          new_owner_id = @params[:current_user_id]
          col_id = acl.collection_id
          collection = Collection.find(col_id)
          previous_owner_id = collection.user_id

          # if user already owns the (unshared) collection, there is nothing to do here
          return if collection.user_id == new_owner_id

          cols = Collection.where([' id = ? or ancestry = ?  or ancestry like ? or ancestry like ? or ancestry like ? ',
                                   col_id, col_id.to_s, '%/' + col_id.to_s, col_id.to_s + '/%',
                                   '%/' + col_id.to_s + '/%'])
          cols.update_all(user_id: new_owner_id)

          acl.update(user_id: previous_owner_id, permission_level: 2)
          collection.update(user_id: new_owner_id)

          user = User.find_by(id: new_owner_id)
          Message.create_msg_notification(
            channel_subject: Channel::COLLECTION_TAKE_OWNERSHIP,
            data_args: { new_owner: user.name, collection_name: collection.label },
            message_from: new_owner_id, message_to: [previous_owner_id]
          )
        else
          c = Collection.find(@params[:id])
          # if user already owns the (unshared) collection, there is nothing to do here
          return if (c.user_id == @params[:current_user_id])

          sample_ids = c.samples.pluck(:id)
          reaction_ids = c.reactions.pluck(:id)
          wellplate_ids = c.wellplates.pluck(:id)
          screen_ids = c.screens.pluck(:id)

          owner = User.find(c.user_id)
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
