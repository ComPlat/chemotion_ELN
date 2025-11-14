class ElementPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def self.update?(user, record)
    new(user, record).update?
  end

  # A user can read/write/share an element if
  # 1. there exists an unshared collection which he owns and that contains the element or
  # 2. the user has been shared a collection containing the element with an according permission level
  def read?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(0)
  end

  def update?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(1)
  end

  def copy?
    return false unless user_and_record_present?

    record_is_in_own_collection? ||
      (record_shared_with_minimum_permission_level?(1) && record_shared_with_minimum_detail_level?(1))
  end

  def share?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(2)
  end

  def destroy?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(3)
  end

  def read_dataset?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_minimum_detail_level?(3)
  end

  def import?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(4)
  end

  def pass_ownership?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(6)
  end

  private

  def user_and_record_present?
    user.present? && record.present?
  end

  def record_is_in_own_collection?
    record.collections.where(user: user).any?
  end

  def record_shared_with_minimum_permission_level?(permission_level)
    record
      .collections
      .shared_with_minimum_permission_level(user, permission_level)
      .any?
  end

  def record_shared_with_minimum_detail_level?(detail_level)
    detail_level_field = "#{Labimotion::Utils.element_name_dc(record.class.to_s)}_detail_level"
    record
      .collections
      .shared_with_minimum_detail_level(user, detail_level_field, detail_level)
      .any?
  end
end
