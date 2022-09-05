# frozen_string_literal: true

class AttachmentPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def self.can_delete?(user, record)
    new(user, record).write?
  end

  def write?
    return false if record.blank?
    return true if created_for_user?

    element = record.container&.root&.containable

    if element.present?
      return true if element.is_a?(User) && (element == user)
      return true if ElementPolicy.update?(user, element)
    end

    false
  end

  private

  def created_for_user?
    record.container_id.nil? && record.created_for == user.id
  end
end
