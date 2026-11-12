# frozen_string_literal: true

module Entities
  class InventoryMappingVersionEntity < Grape::Entity
    expose :id, :connection_id, :version, :status, :origin, :preset_key, :based_on_version_id, :mapping,
           :request_settings, :validation_report, :created_by_id, :accepted_by_id, :accepted_at, :created_at
  end
end
