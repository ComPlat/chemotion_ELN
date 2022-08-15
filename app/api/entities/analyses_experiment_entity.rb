# frozen_string_literal: true

module Entities
  class AnalysesExperimentEntity < ApplicationEntity
    expose(
      :id,
      :devices_analysis_id,
      :on_day,
      :holder_id,
      :status,
      :solvent,
      :experiment,
      :priority,
      :number_of_scans,
      :sweep_width,
      :time,
      :analysis_barcode,
      :sample_short_label,
      :sample_id,
      :devices_sample_id,
      :sample_analysis_id
    )

    private

    def analysis_barcode
      return '' unless object.devices_analysis.analysis_type == 'NMR'

      object.sample.analyses.find_by(id: object.sample_analysis_id)&.bruker_code || ''
    end

    def sample_short_label
      object.sample.short_label
    end
  end
end
