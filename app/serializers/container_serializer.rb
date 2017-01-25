class ContainerSerializer < ActiveModel::Serializer
  attributes :id, :name, :container_type, :description, :extended_metadata, :descendant_ids

  has_many :children
  has_many :attachments, :serializer => AttachmentSerializer

  def children
    object.children.ordered
  end

  def descendant_ids
    object.descendant_ids
  end

  def extended_metadata
    extended_metadata = object.extended_metadata
    return extended_metadata unless extended_metadata

    extended_metadata["report"] = extended_metadata["report"] == "true"

    unless extended_metadata["content"].blank?
      extended_metadata["content"] = JSON.parse(object.extended_metadata["content"])
    end

    extended_metadata
  end

end
