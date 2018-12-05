module Entities
  class AttachmentEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "Attachment's unique id"}
    expose :filename, :identifier, :content_type, :thumb, :aasm_state
  end
end
