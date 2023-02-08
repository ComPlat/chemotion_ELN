# frozen_string_literal: true

module Entities
  class ScanResultEntity < ApplicationEntity
    root :scan_results

    expose :id
    expose :measurement_value
    expose :measurement_unit
    expose :attachment_id
    expose :note
    expose :position

    expose_timestamps

    private

    def attachment_id
      object.attachment&.id
    end
  end
end
