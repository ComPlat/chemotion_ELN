# frozen_string_literal: true

# container serializer class
class ContainerSerializer < ActiveModel::Serializer
  attributes :id, :name, :container_type, :description, :extended_metadata,
             :children, :code_log

  has_many :attachments, serializer: AttachmentSerializer

  def extended_metadata
    get_extended_metadata(object)
  end

  def children
    all_containers = object.hash_tree
    root = all_containers.keys[0]
    arr = []
    get_attachment_ids(arr, all_containers[root])
    attachments = Attachment.where(container_id: arr)

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
      current_attachments = attachments.select do |attach|
        attach.container_id == container.id
      end
      {
        id: container.id,
        name: container.name,
        attachments: current_attachments,
        children: json_tree(attachments, subcontainers).compact,
        description: container.description,
        container_type: container.container_type,
        extended_metadata: get_extended_metadata(container)
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
end
