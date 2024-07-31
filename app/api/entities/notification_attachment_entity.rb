
module Entities
  class NotificationAttachmentEntity < ApplicationEntity
    expose :id, documentation: { type: 'Integer', desc: "Attachment's unique id" }
    expose :filename, :identifier, :content_type, :thumb, :filesize, :attachable_id, :attachable_type, :preview
    expose_timestamps
  end
end
