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

    record_is_in_own_collection? || record_shared_with_at_least?(:read_elements)
  end

  def update?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_at_least?(:edit_elements)
  end

  def copy?
    return false unless user_and_record_present?

    record_is_in_own_collection? ||
      (record_shared_with_at_least?(:edit_elements) && record_shared_with_minimum_detail_level?(1))
  end

  # "Propagate this element onward" — the right to carry it into another collection. Bundled with
  # add_elements: being allowed to add an element somewhere is the same right as being allowed to
  # take it from where it is.
  def share?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_at_least?(:add_elements)
  end

  # Destroying the element *record* (soft-delete) is owner-only. A sharee at :remove_elements may
  # unlink the element from the shared collection (Usecases::Collections::RemoveElements) but never
  # destroy it out from under the owner.
  def destroy?
    return false unless user_and_record_present?

    record_is_in_own_collection?
  end

  def read_dataset?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_minimum_detail_level?(3)
  end

  def import?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_at_least?(:add_elements)
  end

  def pass_ownership?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_at_least?(:pass_ownership)
  end

  private

  def user_and_record_present?
    user.present? && record.present?
  end

  def record_is_in_own_collection?
    record.collections.where(user: user).any?
  end

  # @param level_key [Symbol] a {CollectionShare::PERMISSION_LEVELS} key
  def record_shared_with_at_least?(level_key)
    record
      .collections
      .shared_with_minimum_permission_level(user, CollectionShare.permission_level(level_key))
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
