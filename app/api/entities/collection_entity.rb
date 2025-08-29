# frozen_string_literal: true

module Entities
  class CollectionEntity < ApplicationEntity
    expose! :id
    expose! :ancestry
    expose! :position
    expose! :label
    expose! :tabs_segment
    expose! :inventory_id
    expose! :owner
    expose! :shares, using: 'Entities::CollectionShareEntity'

    def owner
      "#{object.user.name} (#{object.user.name_abbreviation})"
    end

    def shares
      return [] unless object.user_id == current_user.id

      object.collection_shares
    end
  end
end
