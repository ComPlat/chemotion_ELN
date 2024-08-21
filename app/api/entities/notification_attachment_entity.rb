
module Entities
  class NotificationAttachmentEntity < AttachmentEntity
    expose :attachable_id, :attachable_type, :preview
    unexpose :aasm_state
  end
end
