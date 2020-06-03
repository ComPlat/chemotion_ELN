# frozen_string_literal: true

# container serializer class
class ContainerSerializer < ActiveModel::Serializer
  attributes :id, :name, :container_type, :description, :extended_metadata,
             :children, :code_log, :preview_img

  has_many :attachments, serializer: AttachmentSerializer

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
      current_attachments = attachments.select do |att|
        att.content_type = att.content_type || MimeMagic.by_path(att.filename)&.type
        att.for_container? && att.attachable_id == container.id
      end
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
    dataset_ids = (container && container.children.map { |ds| ds.container_type == 'dataset' && ds.id }) || {}
    return { preview: 'not available', id: nil, filename: nil } if dataset_ids.empty?
    attachments = Attachment.where_container(dataset_ids).to_a
    attachments = attachments.select do |a|
      a.thumb == true && a.attachable_type == 'Container' && dataset_ids.include?(a.attachable_id)
    end
    image_atts = attachments.select do |a_img|
      a_img&.content_type&.match(Regexp.union(%w[jpg jpeg png tiff]))
    end

    attachment = image_atts[0] || attachments[0]
    preview = attachment.read_thumbnail if attachment
    result = if preview
      { preview: Base64.encode64(preview), id: attachment.id, filename: attachment.filename }
    else
      { preview: 'not available', id: nil, filename: nil }
    end
    result
  end
end
