# frozen_string_literal: true

module Entities
  class MergedSourceEntity < Grape::Entity
    expose :id
    expose :short_label
    expose :name
    expose :merge_id do |sample|
      sample.outgoing_merge&.id
    end
  end
end
