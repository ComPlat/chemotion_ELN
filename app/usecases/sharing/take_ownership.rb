# frozen_string_literal: true

module Usecases
  module Sharing
    class TakeOwnership
      def initialize(params)
        @params = params
      end

      def execute!
        new_owner_id = @params[:current_user_id]
        acl = CollectionAcl.find_by(collection_id: @params[:id], user_id: new_owner_id)
        col_id = acl.collection_id
        collection = Collection.find(col_id)
        previous_owner_id = collection.user_id

        # if user already owns the (unshared) collection, there is nothing to do here
        return if acl.user_id == previous_owner_id

        cols = Collection.where([' id = ? or ancestry = ?  or ancestry like ? or ancestry like ? or ancestry like ? ',
                                 col_id, col_id.to_s, "%/#{col_id}", "#{col_id}/%", "%/#{col_id}/%"])
        cols.update_all(user_id: new_owner_id)

        acl.update(user_id: previous_owner_id, permission_level: 2)
        collection.update(user_id: previous_owner_id)

        user = User.find_by(id: new_owner_id)
        Message.create_msg_notification(
          channel_subject: Channel::COLLECTION_TAKE_OWNERSHIP,
          data_args: { new_owner: user.name, collection_name: collection.label },
          message_from: new_owner_id, message_to: [previous_owner_id]
        )
      end
    end
  end
end
