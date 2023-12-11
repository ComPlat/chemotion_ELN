# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class VesselEntity < Grape::Entity
      expose(:id,
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
             :bar_code)

      expose :vessel_template_name

      private

      def vessel_template_name
        object.vessel_template.name
      end
    end
  end
end
