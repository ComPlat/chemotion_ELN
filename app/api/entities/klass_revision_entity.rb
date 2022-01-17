# frozen_string_literal: true

module Entities
  # KlassRevisionEntity
  class KlassRevisionEntity < Grape::Entity
    expose :id, :uuid, :properties_release, :released_at

    expose :klass_id do |object|
      klass_id = object.element_klass_id if object.respond_to? :element_klass_id
      klass_id = object.segment_klass_id if object.respond_to? :segment_klass_id
      klass_id = object.dataset_klass_id if object.respond_to? :dataset_klass_id
      klass_id
    end

    def released_at
      object.released_at&.strftime('%d.%m.%Y, %H:%M')
    end
  end
end

