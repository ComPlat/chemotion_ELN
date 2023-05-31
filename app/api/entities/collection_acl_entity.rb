# frozen_string_literal: true

module Entities
  class CollectionAclEntity < ApplicationEntity
    expose :id, documentation: { type: 'integer', desc: 'ID' }
    expose :collection_id, documentation: { type: 'integer', desc: 'Collection ID' }
    expose :user_id, documentation: { type: 'integer', desc: 'User ID' }
    expose :permission_level, documentation: { type: 'string', desc: 'Permission Level' }
    expose :label, documentation: { type: 'string', desc: 'Label' }
    expose :created_at, documentation: { type: 'string', desc: 'Created At' }
    expose :updated_at, documentation: { type: 'string', desc: 'Updated At' }
    expose :sample_detail_level, documentation: { type: 'string', desc: 'Sample Detail Level' }
    expose :reaction_detail_level, documentation: { type: 'string', desc: 'Reaction Detail Level' }
    expose :researchplan_detail_level, documentation: { type: 'string', desc: 'Researchplan Detail Level' }
    expose :wellplate_detail_level, documentation: { type: 'string', desc: 'Wellplate Detail Level' }
    expose :screen_detail_level, documentation: { type: 'string', desc: 'Screen Detail Level' }

    expose :user, using: Entities::UserSimpleEntity, documentation: { type: 'Entities::UserSimpleEntity', desc: 'User Info' }
  end
end
