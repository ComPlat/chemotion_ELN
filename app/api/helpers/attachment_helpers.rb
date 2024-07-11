# frozen_string_literal: true

module AttachmentHelpers
  extend Grape::API::Helpers

  def read_access?(attachment, _user)
    is_owner = attachment.container_id.nil? && attachment.created_for == current_user.id
    return true if is_owner

    element = @attachment.container&.root&.containable
    return false unless element

    return false unless attachment.attachable

    return false if element.is_a?(Container)
    return true if element.is_a?(User) && (element == current_user)

    read_access_on_element = ElementPolicy.new(current_user, element).read?
    read_access_on_dataset = ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?

    read_access_on_element && read_access_on_dataset
  end

  def write_access?(_attachment, _user)
    false
  end
end
