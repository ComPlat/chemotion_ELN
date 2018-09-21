module Entities
  class ContainerEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "Container's unique id"}
    expose :name, :container_type, :description, :extended_metadata,
    :children, :code_log, :preview_img

    expose :attachments, using: Entities::AttachmentEntity

    private
    def extended_metadata
      get_extended_metadata(object)
    end

    def children
      all_containers = object.hash_tree
      root = all_containers.keys[0]
      arr = []
      get_attachment_ids(arr, all_containers[root])
      attachments = Attachment.where_container(arr)

      json_tree(attachments, all_containers[root])
    end

    def get_attachment_ids(arr, containers)
      containers.map do |container, subcontainers|
        arr.push(container.id)
        get_attachment_ids(arr, subcontainers)
      end
    end

    def json_tree(attachments, containers)

      containers.map do |container, subcontainers|
        current_attachments = container.container_type == 'dataset' && attachments.select do |attach|
          attach.attachable_id == container.id
        end || []
        {
          id: container.id,
          name: container.name,
          attachments: current_attachments,
          children: json_tree(attachments, subcontainers).compact,
          description: container.description,
          container_type: container.container_type,
          extended_metadata: get_extended_metadata(container),
          preview_img: preview_img(container)
        }
      end
    end

    def get_extended_metadata(container)
      ext_mdata = container.extended_metadata
      return ext_mdata unless ext_mdata
      ext_mdata['report'] = ext_mdata['report'] == 'true' || ext_mdata == true
      unless ext_mdata['content'].blank?
        ext_mdata['content'] = JSON.parse(container.extended_metadata['content'])
      end
      ext_mdata
    end

    def preview_img(container = object)
      first_child = container.children.length > 0 && container.children[0]
      has_dataset = first_child && first_child.container_type == "dataset"
      if has_dataset
        attachment = first_child.attachments.select {|att| att.thumb}[0]
        preview = attachment.read_thumbnail if attachment
        return preview && Base64.encode64(preview) || "not available"
      end
    end
  end
end
