# frozen_string_literal: true

module Entities
  class CollectionSharedEntity < CollectionEntity
    expose :collection_acls, using: Entities::CollectionAclEntity
    expose :user, using: Entities::UserBasicEntity
  end
end
