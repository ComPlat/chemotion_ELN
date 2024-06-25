# frozen_string_literal: true

module Entities
  class CollectionSharedEntity < CollectionEntity
    expose :collection_acls, using: Entities::CollectionAclEntity
    expose :user, using: Entities::UserSimpleEntity

    # only return acl for current user
    def collection_acls
      object.collection_acls.shared_with(options[:shared_with])
    end
  end
end
