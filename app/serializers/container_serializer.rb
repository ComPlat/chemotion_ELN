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

end
