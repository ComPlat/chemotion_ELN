# frozen_string_literal: true

module Entities
  class AttachmentReportEntity < AttachmentEntity
    expose :thumbnail

    def thumbnail
      return nil unless object.thumb

      data = object.read_thumbnail
      data.present? ? Base64.encode64(data) : nil
    end
  end
end
