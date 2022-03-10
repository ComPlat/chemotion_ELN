# frozen_string_literal: true

module Entities
  class TaskEntity < TaskListEntity
    expose :image
    def image
      Base64.encode64(object.attachment.read_file) if object.attachment.present?
    end
  end
end
