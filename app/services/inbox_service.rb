# frozen_string_literal: true

class InboxService
  def initialize(container)
    @container = container
  end

  def to_hash(device_boxes)
    {
      inbox: {
        children: device_boxes,
        count: @container.children.size,
        container_type: @container.container_type,
        unlinked_attachments: Attachment.where(
          attachable_type: 'Container',
          attachable_id: nil,
          created_for: @container&.containable&.id,
        ),
        inbox_count: @container.descendants.includes(:attachments).sum { |dataset| dataset&.attachments&.size },
      },
    }
  end
end
