# frozen_string_literal: true

module Entities
  class InventoryEntity < ApplicationEntity
    expose :id, documentation: { type: 'Integer', desc: "Inventory's id" }
    expose :prefix, documentation: { type: 'String', desc: "Inventory's prefix" }
    expose :name, documentation: { type: 'String', desc: "Inventory's name" }
    expose :counter, documentation: { type: 'Integer', desc: "Inventory's counter" }
  end
end
