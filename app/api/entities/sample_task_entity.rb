# frozen_string_literal: true

module Entities
  class SampleTaskEntity < ApplicationEntity
    root :sample_tasks # root key when rendering a list of sample tasks

    expose :description
    expose :display_name
    expose :id
    expose :required_scan_results
    expose :result_unit
    expose :result_value
    expose :sample_id
    expose :sample_svg_file
    expose :short_label
    expose :scan_results, using: 'Entities::ScanResultEntity'
    expose :target_amount_value
    expose :target_amount_unit
    expose :done

    expose_timestamps

    private

    delegate(
      :short_label,
      :sample_svg_file,
      :target_amount_value,
      :target_amount_unit,
      to: :'object.sample',
      allow_nil: true,
    )

    def display_name
      object.sample&.name || object.sample&.showed_name
    end

    def scan_results
      object.scan_results.order(position: :asc)
    end

    def done
      object.done?
    end
  end
end
