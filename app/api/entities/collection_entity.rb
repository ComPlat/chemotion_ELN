# frozen_string_literal: true

module Entities
  class CollectionEntity < ApplicationEntity
    expose! :id
    expose! :ancestry
    expose! :label
    expose! :tabs_segment
    expose! :inventory_id
    expose! :owner
    expose! :shares, using: 'Entities::CollectionShareEntity'

    def owner
      "#{user.name} (#{user.name_abbreviation})"
    end

    def shares
      return [] unless user_id == current_user.id

      collection_shares
    end
  end
end
