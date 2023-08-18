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
          keys = CollectionAcl.attribute_names - %w[id fake_ancestry]
          acl_collection_attributes = collection_attributes.select do |k, _v|
            k.to_s.match(/#{keys.join('|')}/)
          end
          acl_col = CollectionAcl.find_or_create_by(
            user_id: acl_collection_attributes['user_id'],
            collection_id: acl_collection_attributes['collection_id']
          )
          acl_col.update(
            permission_level: acl_collection_attributes['permission_level'],
            sample_detail_level: acl_collection_attributes['sample_detail_level'],
            reaction_detail_level: acl_collection_attributes['reaction_detail_level'],
            wellplate_detail_level: acl_collection_attributes['wellplate_detail_level'],
            screen_detail_level: acl_collection_attributes['screen_detail_level'],
            label: acl_collection_attributes['label']
          )

          # find or create and assign parent collection ()

          # SendSharingNotificationJob.perform_later(@user, '')
        end
      end
    end
  end
end
