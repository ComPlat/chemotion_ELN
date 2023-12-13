# frozen_string_literal: true

module OrdKit
  module Exporter
    module Vessels
      class VesselExporter < OrdKit::Exporter::Base
        def to_ord
          return unless model

          OrdKit::Vessel.new(
            id: model.id,
            name: model.name,
            label: model.short_label,
            description: model.description,
            details: model.details,
            type: vessel_type,
            material: vessel_material,
            volume: volume,
            weight: weight,
            bar_code: model.bar_code,
            qr_code: model.qr_code,
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
          VesselTypeExporter.new(model).to_ord
        end

        def vessel_material
          VesselMaterialExporter.new(model).to_ord
        end

        def preparations
          VesselPreparationsExporter.new(model).to_ord
        end

        def attachments
          VesselAttachmentsExporter.new(model).to_ord
        end

        def volume
          Metrics::Amounts::VolumeExporter.new(
            { value: model.volume_amount, unit: model.volume_unit }.stringify_keys,
          ).to_ord
        end

        def weight
          Metrics::Amounts::MassExporter.new(
            { value: model.weight_amount, unit: model.weight_unit }.stringify_keys,
          ).to_ord
        end
      end
    end
  end
end
