module Entities
  class ReportTemplateEntity < Grape::Entity
    expose :id, documentation: { type: 'Integer', desc: "Report Template's unique id" }
    expose :name, :report_type,  :attachment_id

    expose :attachment do |obj|
      Entities::AttachmentEntity.represent(obj.attachment)
    end
  end
end
