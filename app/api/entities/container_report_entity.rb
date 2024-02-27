# frozen_string_literal: true

module Entities
  class ContainerReportEntity < ContainerEntity
    expose :attachments, using: 'Entities::AttachmentReportEntity'
  end
end
