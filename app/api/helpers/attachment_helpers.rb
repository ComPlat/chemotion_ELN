# frozen_string_literal: true

# rubocop:disable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

module AttachmentHelpers
  extend Grape::API::Helpers

  def common_access_check(attachment, user)
    element = attachment.container&.root&.containable
    is_owner = attachment.container_id.nil? && attachment.created_for == user.id

    return 'is_owner' if is_owner

    return 'not_allowed' unless element

    return 'not_allowed' unless attachment.attachable

    return 'not_allowed' if element.is_a?(Container)
    return 'allowed' if element.is_a?(User) && (element == user)

    'to_be_determined'
  end

  def read_access?(attachment, user)
    element = attachment.container&.root&.containable
    pre_check = common_access_check(attachment, user)
    return false if pre_check == 'not_allowed'
    return true unless pre_check == 'to_be_determined'

    read_access_on_element = ElementPolicy.new(user, element).read?
    read_access_on_dataset = ElementPermissionProxy.new(user, element, [user.id]).read_dataset?

    read_access_on_element && read_access_on_dataset
  end

  def write_access?(attachment, user)
    element = attachment.container&.root&.containable
    pre_check = common_access_check(attachment, user)
    return false if pre_check == 'not_allowed'
    return true unless pre_check == 'to_be_determined'

    update_access_on_element = ElementPolicy.new(user, element).update?
    read_access_on_dataset = ElementPermissionProxy.new(user, element, [user.id]).read_dataset?

    update_access_on_element && read_access_on_dataset
  end
end
# rubocop:enable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
