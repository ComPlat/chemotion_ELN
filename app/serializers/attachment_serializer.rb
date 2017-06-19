class AttachmentSerializer < ActiveModel::Serializer
  attributes :id, :filename, :identifier, :content_type, :thumb
end
