# frozen_string_literal: true

module GrapeEntityHelpers
  def grape_entity_as_hash
    entity.serializable_hash.to_h
  end
end

RSpec.configure do |config|
  config.include GrapeEntityHelpers
end
