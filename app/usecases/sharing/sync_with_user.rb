module Usecases
  module Sharing
    class SyncWithUser
      def initialize(params)
        @params = params
      end

      def execute!
        ActiveRecord::Base.transaction do
          collection_attributes = @params.fetch(:collection_attributes, {})
          keys = SyncCollectionsUser.attribute_names-['id','fake_ancestry']
          sync_collection_attributes = collection_attributes.select do |k,v|
            k.to_s.match(/#{keys.join('|')}/)
          end
          c = SyncCollectionsUser.create(sync_collection_attributes)
          current_user_id = collection_attributes.fetch(:shared_by_id)

          # find or create and assign parent collection ()
          root_label = "with %s" %c.user.name_abbreviation
          root_collection_attributes = {
            label: root_label,
            user_id: collection_attributes[:user_id],
            shared_by_id: current_user_id,
            is_locked: true,
            is_shared: true
          }

          rc = Collection.find_or_create_by(root_collection_attributes)
          c.update(fake_ancestry: rc.id.to_s)

          # SendSharingNotificationJob.perform_later(@user, '')
        end
      end
    end
  end
end
