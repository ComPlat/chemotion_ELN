# frozen_string_literal: true

module Entities
  class InboxEntity < ApplicationEntity
    expose(
      :children,
      :children_count,
      :total_attachment_count,
      :container_type,
      :id,
      :inbox_count,
      :name,
      :unlinked_attachments,
    )

    private

    def children
      serialize_children(object.hash_tree(limit_depth: 2)[object])
      # serialize_children(object.hash_tree[object])
    end

    def children_count
      object.leaves.count
    end

    def descendents
      @descendents ||= object.hash_tree[object]
    end

    def all_descendants_attachments
      @all_descendants_attachments ||= Attachment.where_container(object.descendant_ids)
    end

    def serialize_children(container_tree_hash)
      container_tree_hash.map do |container, subcontainers|
        current_attachments = all_descendants_attachments.select { |att| att.attachable_id == container.id }

        {
          id: container.id,
          name: container.name,
          container_type: container.container_type,
          attachments: current_attachments,
          created_at: container.created_at,
          children: serialize_children(subcontainers).compact
        }
      end
    end

    def total_attachment_count
      object.descendants.includes(:attachments).sum { |dataset| dataset&.attachments&.size }
    end

    def unlinked_attachments
      Attachment.where(
        attachable_type: 'Container',
        attachable_id: nil,
        created_for: object&.containable&.id,
      )
    end

    def inbox_count
      all_descendants_attachments.size + unlinked_attachments.size
    end
  end
end
