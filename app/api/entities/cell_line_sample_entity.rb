# frozen_string_literal: true

module Entities
  class CellLineSampleEntity < Grape::Entity
    expose :id
    expose :amount
    expose :passage
    expose :contamination
    expose :name
    expose :short_label
    expose :description
    expose :unit
    expose :cellline_material
    expose :tag
    expose :container, using: 'Entities::ContainerEntity'

    def tag
      collections = object.collections.reject { |col| col.label == 'All' }.map do |col|
        { id: col.id,
          name: col.label,
          user_id: col.user_id,
          is_shared: col.is_shared,
          shared_by_id: col.shared_by_id,
          is_synchronized: col.is_synchronized }
      end
      { taggable_data: {
        collection_labels: collections,
      } }
    end
  end
end
