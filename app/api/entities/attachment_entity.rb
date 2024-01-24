# frozen_string_literal: true

module Entities
  class AttachmentEntity < ApplicationEntity
    expose :id, documentation: { type: 'Integer', desc: "Attachment's unique id" }
    expose :filename, :identifier, :content_type, :thumb, :aasm_state, :filesize, :thumbnail
    expose_timestamps

    def thumbnail
      object.thumb ? Base64.encode64(object.read_thumbnail) : nil
    end
  end
end
