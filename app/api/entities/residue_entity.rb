# frozen_string_literal: true

module Entities
  class ResidueEntity < ApplicationEntity
    expose(
      :custom_info,
      :id,
      :residue_type,
    )
  end
end
