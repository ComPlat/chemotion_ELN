# frozen_string_literal: true

module Entities
  class OwnCollectionEntity < ApplicationEntity
    self.hash_access = :to_s

    expose! :id
    expose! :ancestry
    expose! :position
    expose! :label
    expose! :tabs_segment
    expose! :inventory_id
    expose! :inventory_name
    expose! :inventory_prefix
    expose! :locked

    def locked
      object["label"].in?(['All', 'chemotion-repository-net'])
    end
  end
end
