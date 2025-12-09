# frozen_string_literal: true

module Entities
  class AttachmentEntity < ApplicationEntity
    expose :id, documentation: { type: 'Integer', desc: "unique id" }
    expose :filename, documentation: { type: 'String', desc: "filename" }
    expose :identifier, documentation: { type: 'String', desc: "identifier uuid" }
    expose :content_type, documentation: { type: 'String', desc: "content type" }
    expose :thumb, documentation: { type: 'String', desc: "thumbnail url" }
    expose :aasm_state, documentation: { type: 'String', desc: "processing state for analytics derivative" }
    expose :filesize, documentation: { type: 'Integer', desc: "filesize in bytes" }
    expose :edit_state, documentation: { type: 'String', desc: "edit state for external viewing/editing" }
    expose_timestamps
  end
end
