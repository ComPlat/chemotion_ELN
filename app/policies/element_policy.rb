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

  # Editing requires a full detail level on a shared element, not just edit permission.
  # The two axes are independent: a sharee below the anonymization threshold receives the
  # redaction placeholders ('***', [], {}) for the fields their level hides, and — since the
  # write path (declared attributes, nested materials via UpdateMaterials, variations) has no
  # way to tell an echoed placeholder from a genuine edit — saving would overwrite the owner's
  # real data with those placeholders. Gating the whole write on full detail closes every such
  # path at once, mirroring how #copy? already combines the permission and detail-level axes.
  # This is the only real gate against that: frontend heuristics like Element#isMethodDisabled
  # / Element#serialize's '***' filter (app/javascript/src/models/Element.js) are best-effort
  # UI hints that can't reliably detect Hash/Array-shaped placeholders, not a security boundary.
  #
  # Scope, though: #record_shared_with_minimum_detail_level? below derives its column from
  # record.class, so this gates writes to *this record type's own* fields only. Detail levels are
  # per element type and independent, and ApplicationEntity anonymizes each nested entity against
  # detail_levels[nested_object.class] — so a collection shared at reaction_detail_level 10 with
  # sample_detail_level 1 passes this check for the Reaction while its nested samples still arrive
  # anonymized, and Usecases::Reactions::UpdateMaterials assigns them unconditionally. Nested
  # elements of a different type therefore need their own check; do not read this method as
  # covering them.
  def update?
    return false unless user_and_record_present?

    record_is_in_own_collection? ||
      (record_shared_with_at_least?(:edit_elements) && record_shared_with_minimum_detail_level?(10))
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

  # Whether the record's structural data (e.g. a Sample's molfile, see SampleEntity's
  # `anonymize_below: 1`) is visible to the user, as opposed to merely being able to see that
  # the record exists (see #read?).
  def read_structure?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_minimum_detail_level?(1)
  end

  # Whether the user holds full (owner-equivalent) detail access to the record on *this record
  # type's own* detail-level column (e.g. reaction_detail_level for a Reaction) — narrower than
  # Collection.full_detail_access_ids, which additionally requires every other element type's
  # detail level to be at OWNER_LEVEL too, since it gates exporting the whole collection raw. Used
  # where an operation would expose more than the record's own fields, e.g. a Reaction's composed
  # report scheme, which is only exposed to a sharee at ReactionEntity's `anonymize_below: 10`.
  def read_full_detail?
    return false unless user_and_record_present?

    record_is_in_own_collection? || record_shared_with_minimum_detail_level?(Collection::OWNER_LEVEL)
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
