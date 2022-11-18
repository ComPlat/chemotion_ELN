# frozen_string_literal: true

module Entities
  class SampleTaskEntity < ApplicationEntity
    root :sample_tasks # root key when rendering a list of sample tasks

    expose :id
    expose :measurement_value
    expose :measurement_unit
    expose :description
    expose :private_note
    expose :additional_note
    expose :sample_id
    expose :display_name
    expose :short_label
    expose :sample_svg_file
    expose :image, unless: :displayed_in_list

    expose_timestamps

    private

    delegate(:short_label, :sample_svg_file, to: :'object.sample', allow_nil: true)

    def display_name
      object.sample&.showed_name
    end

    def image
      return nil unless object.attachment

      Base64.encode64(object.attachment&.read_file)
    end
  end
end
