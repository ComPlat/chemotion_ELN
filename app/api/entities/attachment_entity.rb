# frozen_string_literal: true

module Entities
  class AttachmentEntity < Grape::Entity
<<<<<<< HEAD
    expose :id, documentation: { type: "Integer", desc: "Attachment's unique id"}
    expose :filename, :identifier, :content_type, :thumb, :aasm_state, :is_editing, :version_numb, :updated_at

    def version_numb
      object.log_version
=======
    expose :id, documentation: { type: 'Integer', desc: "Attachment's unique id" }
    expose :filename, :identifier, :content_type, :thumb, :aasm_state, :is_editing, :version_numb, :updated_at

    def version_numb
      object.log_version if object.log_data.present?
>>>>>>> 1277-using-gemshrine-file-service
    end

    def updated_at
      object.updated_at&.strftime('%d.%m.%Y, %H:%M')
    end
  end
end
