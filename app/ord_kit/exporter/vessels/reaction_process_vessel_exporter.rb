# frozen_string_literal: true

module OrdKit
  module Exporter
    module Vessels
      class ReactionProcessVesselExporter < OrdKit::Exporter::Base
        attr_reader :vessel

        def to_ord
          return unless model

          @vessel = model.vessel

          OrdKit::Vessel.new(
            id: vessel.id,
            name: vessel.name,
            label: vessel.short_label,
            description: vessel.description,
            details: vessel.details,
            type: vessel_type,
            material: vessel_material,
            volume: volume,
            weight: weight,
            bar_code: vessel.bar_code,
            qr_code: vessel.qr_code,
            preparations: preparations,
            attachments: attachments,
            vessel_id: nil, # Unknown in ELN.
            position: nil, # Unknown in ELN.
            row: nil, # Unknown in ELN.
            col: nil, # Unknown in ELN.
          )
        end

        private

        def vessel_type
          VesselTypeExporter.new(vessel).to_ord
        end

        def vessel_material
          VesselMaterialExporter.new(vessel).to_ord
        end

        def preparations
          VesselPreparationsExporter.new(model.preparations).to_ord
        end

        def attachments
          VesselAttachmentsExporter.new(vessel).to_ord
        end

        def volume
          Metrics::Amounts::VolumeExporter.new(
            { value: vessel.volume_amount, unit: vessel.volume_unit }.stringify_keys,
          ).to_ord
        end

        def weight
          Metrics::Amounts::MassExporter.new(
            { value: vessel.weight_amount, unit: vessel.weight_unit }.stringify_keys,
          ).to_ord
        end
      end
    end
  end
end
