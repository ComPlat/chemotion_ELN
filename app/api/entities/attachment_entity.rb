# frozen_string_literal: true

module Entities
  class AttachmentEntity < Grape::Entity
    expose :id, documentation: { type: 'Integer', desc: "Attachment's unique id" }
    expose :filename, :identifier, :content_type, :thumb, :aasm_state, :filesize, :thumbnail

    def thumbnail
      return unless object.thumb

      preview = object&.read_thumbnail
      (preview && Base64.encode64(preview)) || 'not available'
    end
  end
end
