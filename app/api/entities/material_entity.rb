module Entities
  class MaterialEntity < ApplicationEntity
    expose(
      :coefficient,
      :equivalent,
      :position,
      :reference,
      :show_label,
      :waste,
    )

    expose :sample, using: 'Entities::SampleEntity', merge: true
  end
end
