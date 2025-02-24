# frozen_string_literal: true

module OrdKit
  module Exporter
    module Vessels
      class ReactionProcessVesselExporter < OrdKit::Exporter::Base
        attr_reader :vessel

        def to_ord
          return unless model

          @vessel = model.vesselable

          OrdKit::Vessel.new(
            id: vessel.id,
            name: vessel.name,
            label: short_label,
            description: description,
            details: vessel.details,
            type: vessel_type,
            material: vessel_material,
            volume: volume,
            weight: weight,
            bar_code: bar_code,
            qr_code: qr_code,
            preparations: preparations,
            attachments: attachments,
            vessel_class: vessel.class.to_s,
          )
        end

        private

        def description
          vessel.try(:description)
        end

        def short_label
          vessel.try(:short_label)
        end

        def bar_code
          vessel.try(:bar_code)
        end

        def qr_code
          vessel.try(:qr_code)
        end

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
