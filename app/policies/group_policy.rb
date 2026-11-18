# frozen_string_literal: true

class GroupPolicy
  attr_reader :user, :group

  def initialize(user, group)
    @user = user
    @group = group
  end

  def system_admin?
    user.present? && user.is_a?(Admin)
  end

  def group_admin?
    user.present? && group.present? && group.administrated_by?(user)
  end

  def member?
    user.present? && group.present? && group.users.exists?(id: user.id)
  end

  # System Admin or this group's own admin may manage membership/admins/destroy.
  def manage?
    system_admin? || group_admin?
  end

  # A member may remove themself ("leave").
  def leave?(target_user_id)
    member? && user.id == target_user_id
  end

  def last_admin?(target_user_id)
    group.sole_admin?(target_user_id)
  end
end
