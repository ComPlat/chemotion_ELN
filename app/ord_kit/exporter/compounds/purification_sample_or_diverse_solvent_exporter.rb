# frozen_string_literal: true

module OrdKit
  module Exporter
    module Compounds
      class PurificationSampleOrDiverseSolventExporter
        def initialize(sample_id)
          # Not optimal. We have 2 types of solvents: Samples, DiverseSolvent
          # As it is explicitly requested to have them joined in one UI select,
          # they are merged together into ReactionProcessStepEntity#materials_options
          # and consequently the ids of 2 different actions are stored in a single array.
          # Maybe there is a better way as this creates some issues.
          # We need to .find in multiple ActiveRecords (DiverseSolvent have uuid, so sort of ok)

          @sample = Sample.find_by(id: sample_id) || Medium::DiverseSolvent.find_by(id: sample_id)
        end

        def to_ord
          PurificationCompoundExporter.new(@sample).to_ord
        end
      end
    end
  end
end
