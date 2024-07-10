# frozen_string_literal: true

module AttachmentHelpers
  extend Grape::API::Helpers

  def has_read_access(_attachment_id, _user)
    false
  end

  def has_write_access(_attachment_id, _user)
    false
  end
end
