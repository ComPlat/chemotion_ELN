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
        inbox_count: Container.where(id: @container.descendant_ids)
                              .joins(children: :attachments)
                              .count('attachments.id'),
      },
    }
  end
end
