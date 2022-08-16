# frozen_string_literal: true

module Entities
  class FreeScanEntity < Grape::Entity
    expose :id, :name, :container_type, :children, :inbox_count

    def children
      all_containers = object.children
      arr = []
      get_attachment_ids(arr, all_containers)
      attachments = Attachment.where_container(arr)
      result = []
      attachments.map do |att|
        new_att = {}
        new_att[:id] = att[:id]
        new_att[:filename] = att[:filename]
        new_att[:attachable_id] = att[:attachable_id]
        new_att[:attachable_type] = att[:attachable_type]
        new_att[:scan_data] = all_containers.find(att.container_id)[:extended_metadata]['scan_data']
        result.push(new_att)
      end

      result
    end

    def get_attachment_ids(arr, containers)
      return if containers.nil?
      containers.map do |container, subcontainers|
        arr.push(container.id)
        get_attachment_ids(arr, subcontainers)
      end
    end

    def json_tree(attachments, containers)
      containers.map do |container, subcontainers|
        current_attachments = attachments.select do |att|
          att.for_container? && att.attachable_id == container.id
        end

        { id: container.id,
          name: container.name,
          container_type: container.container_type,
          attachments: current_attachments,
          created_at: container.created_at,
          children: json_tree(attachments, subcontainers).compact }
      end
    end

    def inbox_count
      all_containers = object.children
      arr = []
      get_attachment_ids(arr, all_containers)

      count = Attachment.where_container(arr).length
      count
    end
  end
end
