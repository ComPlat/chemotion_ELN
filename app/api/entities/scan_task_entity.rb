# frozen_string_literal: true

module Entities
  class ScanTaskEntity < ApplicationEntity
    expose(
      :additional_note,
      :additional_note,
      :created_at,
      :created_at,
      :description,
      :description,
      :id,
      :image,
      :measurement_unit,
      :measurement_value,
      :private_note,
      :sample_id,
      :sample_svg_file,
      :short_label,
      :showed_name,
      :status,
      :updated_at
    )
    expose_timestamps

    def sample_id
      object.sample.id
    end

    def sample_svg_file
      object.sample.sample_svg_file
    end

    def showed_name
      object.sample.showed_name
    end

    def short_label
      object.sample.short_label
    end

    def image
      return nil if displayed_in_list?

      Base64.encode64(object.attachment.read_file) if object.attachment.present?
    end
  end
end
