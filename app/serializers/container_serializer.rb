class ContainerSerializer < ActiveModel::Serializer
  attributes :id, :name, :container_type, :description, :extended_metadata, :children

  has_many :attachments, :serializer => AttachmentSerializer


  def extended_metadata
    extended_metadata = object.extended_metadata
    return extended_metadata unless extended_metadata

    extended_metadata["report"] = extended_metadata["report"] == "true"

    unless extended_metadata["content"].blank?
      extended_metadata["content"] = JSON.parse(object.extended_metadata["content"])
    end

    extended_metadata
  end

  def children
    all_containers = object.hash_tree
    root = all_containers.keys[0]
    arr = Array.new
    get_attchement_ids(arr, all_containers[root])
    attachments = Attachment.where(container_id: arr)

    json_tree(attachments, all_containers[root])
  end

  def get_attchement_ids(arr, containers)
    containers.map do |container, subcontainers|
      arr.push(container.id)
      get_attchement_ids(arr, subcontainers)
    end
  end

  def json_tree(attachments, containers)
      containers.map do |container, subcontainers|
        current_attachments = attachments.select{|attach| attach.container_id == container.id}
        {:id => container.id,
          :name => container.name,
          :container_type => container.container_type,
          :description => container.description,
          :extended_metadata => get_extended_metadata(container),
          :attachments => current_attachments,
          :children => json_tree(attachments, subcontainers).compact}
      end
  end

  def get_extended_metadata(container)
    extended_metadata = container.extended_metadata
    return extended_metadata unless extended_metadata

    extended_metadata["report"] = extended_metadata["report"] == "true"

    unless extended_metadata["content"].blank?
      extended_metadata["content"] = JSON.parse(container.extended_metadata["content"])
    end

    extended_metadata
  end
end
