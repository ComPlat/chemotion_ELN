# frozen_string_literal: true

module Entities
  class AttachmentEntity < ApplicationEntity
    expose :id, documentation: { type: 'Integer', desc: "Attachment's unique id" }
    expose :filename, :identifier, :content_type, :thumb, :aasm_state, :filesize
    expose_timestamps
  end
end
