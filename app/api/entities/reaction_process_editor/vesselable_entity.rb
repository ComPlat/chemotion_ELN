# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class VesselableEntity < Grape::Entity
      expose(:id,
             :value,
             :label,
             :vesselable_type,
             :vesselable_id,
             :name,
             :vessel_template_id,
             :description,
             :short_label,
             :details,
             :material_details,
             :material_type,
             :vessel_type,
             :volume_amount,
             :volume_unit,
             :weight_amount,
             :weight_unit,
             :qr_code,
             :bar_code,
             :is_vessel_template)

      expose :vessel_template_name

      private

      def vesselable_id
        object.id
      end

      def value
        object.id
      end

      def label
        is_vessel_template ? object.name : object.short_label
      end

      def vesselable_type
        object.class.to_s
      end

      def details
        is_vessel_template ? object.details : object.description
      end

      def description
        is_vessel_template ? object.details : object.description
      end

      def short_label
        is_vessel_template ? '' : object.short_label
      end

      def vessel_template_id
        is_vessel_template ? object.id : object.vessel_template_id
      end

      def qr_code
        is_vessel_template ? nil : object.qr_code
      end

      def bar_code
        is_vessel_template ? nil : object.bar_code
      end

      def is_vessel_template # rubocop:disable Naming
        object.instance_of?(VesselTemplate)
      end

      def vessel_template_name
        is_vessel_template ? object.name : object.vessel_template.name
      end
    end
  end
end
