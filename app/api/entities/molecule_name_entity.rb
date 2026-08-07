# frozen_string_literal: true

module Entities
  class MoleculeNameEntity < ApplicationEntity
    expose(
      :id,
      :description,
      :name,
    )

    expose_timestamps
  end
end
