# frozen_string_literal: true

module Entities
  class MoleculeNameEntity < ApplicationEntity
    expose(
      :description,
      :name,
    )

    expose_timestamps
  end
end
