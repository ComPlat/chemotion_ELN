# frozen_string_literal: true

# Promote a single archived attachment back to the hot storage tier.
# Enqueued when a cold file is actually read, so it moves off cold in the
# background instead of blocking the request that triggered the read.
class PromoteAttachmentJob < ApplicationJob
  queue_as :promote_attachment

  def perform(attachment_id)
    attachment = Attachment.find_by(id: attachment_id)
    return if attachment.nil?

    attachment.move_to_store
  end
end
