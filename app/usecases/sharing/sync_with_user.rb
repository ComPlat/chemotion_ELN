# frozen_string_literal: true

module Usecases
  module Sharing
    class SyncWithUser
      def initialize(params)
        @params = params
      end

      def execute!
        ActiveRecord::Base.transaction do
          collection_attributes = @params.fetch(:collection_attributes, {})
          keys = SyncCollectionsUser.attribute_names - %w[id fake_ancestry]
          sync_collection_attributes = collection_attributes.select do |k, _v|
            k.to_s.match(/#{keys.join('|')}/)
          end
          sCol = SyncCollectionsUser.find_or_create_by(
            user_id: sync_collection_attributes['user_id'],
            collection_id: sync_collection_attributes['collection_id'],
            shared_by_id: sync_collection_attributes['shared_by_id']
          )
          sCol.update_attributes(
            permission_level: sync_collection_attributes['permission_level'],
            sample_detail_level: sync_collection_attributes['sample_detail_level'],
            reaction_detail_level: sync_collection_attributes['reaction_detail_level'],
            wellplate_detail_level: sync_collection_attributes['wellplate_detail_level'],
            screen_detail_level: sync_collection_attributes['screen_detail_level'],
            label: sync_collection_attributes['label']
          )

          current_user_id = collection_attributes.fetch(:shared_by_id)

          # find or create and assign parent collection ()
          root_label = format('with %s', sCol.user.name_abbreviation)
          root_collection_attributes = {
            label: root_label,
            user_id: collection_attributes[:user_id],
            shared_by_id: current_user_id,
            is_locked: true,
            is_shared: true
          }

          rc = Collection.find_or_create_by(root_collection_attributes)
          sCol.update(fake_ancestry: rc.id.to_s)

          # SendSharingNotificationJob.perform_later(@user, '')
        end
      end
    end
  end
end
