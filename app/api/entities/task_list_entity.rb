# frozen_string_literal: true

module Entities
  class TaskListEntity < Grape::Entity
    expose :id
    expose :sample_id, :measurement_value, :sample_svg_file, :showed_name,
           :measurement_unit, :short_label, :description, :private_note, :additional_note
    expose :status
    expose :created_at, :updated_at
    def sample_id
      object.sample[:id]
    end

    def measurement_value
      object[:measurement_value]
    end

    def measurement_unit
      object[:measurement_unit]
    end

    def sample_svg_file
      object.sample[:sample_svg_file]
    end

    def showed_name
      object.sample.showed_name
    end

    def short_label
      object.sample[:short_label]
    end

    def description
      object[:description]
    end

    def created_at
      object.created_at.strftime('%d.%m.%Y, %H:%M')
    end
  end
end