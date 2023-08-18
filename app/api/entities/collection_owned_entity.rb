# frozen_string_literal: true

module Entities
  class CollectionOwnedEntity < CollectionEntity
    expose :collection_acls, using: Entities::CollectionAclEntity
  end
end
