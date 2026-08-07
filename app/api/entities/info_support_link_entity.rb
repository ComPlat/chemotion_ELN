# frozen_string_literal: true

module Entities
  class InfoSupportLinkEntity < ApplicationEntity
    expose :id
    expose :label
    expose :url
    expose :position
    expose :enabled

    expose_timestamps
  end
end
