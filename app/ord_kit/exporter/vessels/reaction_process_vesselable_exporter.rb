# frozen_string_literal: true

module OrdKit
  module Exporter
    module Vessels
      class ReactionProcessVesselableExporter < OrdKit::Exporter::Base
        attr_reader :vessel, :vessel_template

        def to_ord
          vesselable = model&.vesselable
          return unless vesselable

          if model.vesselable_type == 'VesselTemplate'
            @vessel_template = vesselable
            @vessel = nil
          else
            @vessel_template = vesselable.vessel_template
            @vessel = vesselable
          end

          OrdKit::VesselTemplate.new(
            id: vessel_template.id,
            name: vessel_template.name,
            details: vessel_template.details,
            type: vessel_type,
            material: vessel_material,
            volume: volume,
            preparations: preparations,
            attachments: attachments,
            vessel: vessel_instance(vessel),
          )
        end

        private

        def vessel_instance(vessel)
          return unless vessel

          OrdKit::Vessel.new(
            id: vessel.id,
            label: vessel.short_label,
            description: vessel.description,
            bar_code: vessel.bar_code,
            qr_code: vessel.qr_code,
            weight: weight,
          )
        end

        def vessel_type
          VesselTypeExporter.new(vessel_template).to_ord
        end

        def vessel_material
          VesselMaterialExporter.new(vessel_template).to_ord
        end

        def preparations
          VesselPreparationsExporter.new(model.preparations).to_ord
        end

        def attachments
          VesselAttachmentsExporter.new(vessel_template).to_ord
        end

        def volume
          Metrics::Amounts::VolumeExporter.new(
            { value: vessel_template.volume_amount, unit: vessel_template.volume_unit }.stringify_keys,
          ).to_ord
        end

        def weight
          return unless vessel

          Metrics::Amounts::MassExporter.new(
            { value: vessel.weight_amount, unit: vessel.weight_unit }.stringify_keys,
          ).to_ord
        end
      end
    end
  end
end
