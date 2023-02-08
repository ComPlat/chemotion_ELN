# frozen_string_literal: true

module Entities
  class ScanResultEntity < ApplicationEntity
    root :scan_results

    expose :attachment_id
    expose :id
    expose :measurement_unit
    expose :measurement_value
    expose :position
    expose :title

    expose_timestamps

    private

    def attachment_id
      object.attachment&.id
    end
  end
end
