# frozen_string_literal: true

module Entities
  class CollectionAclEntity < ApplicationEntity
    expose :id, documentation: { type: 'integer', desc: 'ID' }
    expose :collection_id, documentation: { type: 'integer', desc: 'Collection ID' }
    expose :user_id, documentation: { type: 'integer', desc: 'User ID' }
    expose :permission_level, documentation: { type: 'string', desc: 'Permission Level' }
    expose :created_at, documentation: { type: 'string', desc: 'Created At' }
    expose :updated_at, documentation: { type: 'string', desc: 'Updated At' }

    expose :user, using: Entities::UserBasicEntity, documentation: { type: 'Entities::UserEntity', desc: 'User Info' }
  end
end
