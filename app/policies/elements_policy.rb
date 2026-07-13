class ElementsPolicy
  attr_reader :user, :records_scope

  def initialize(user, records_scope)
    @user = user
    @records_scope = records_scope
  end

  def read_all?
    allowed?(CollectionShare.permission_level(:read_elements))
  end

  def update_all?
    allowed?(CollectionShare.permission_level(:edit_elements))
  end

  # Bulk counterpart of ElementPolicy#share? — propagating elements onward, bundled with add_elements.
  def share_all?
    allowed?(CollectionShare.permission_level(:add_elements))
  end

  # Bulk counterpart of unlinking an element from a collection: a sharee at :remove_elements may
  # remove the selection from the shared collection (Usecases::Collections::RemoveElements).
  def remove_all?
    allowed?(CollectionShare.permission_level(:remove_elements))
  end

  # Destroying element records is owner-only, mirroring ElementPolicy#destroy?. A sharee may unlink
  # elements from a shared collection at :remove_elements, but that goes through
  # Usecases::Collections::RemoveElements, not here.
  def destroy_all?
    return false unless user_and_scope_present?
    return false if record_ids_that_should_be_inaccessible.any?

    records_only_from_own_collections?
  end

  def allowed?(level)
    return false unless user_and_scope_present?
    return false if record_ids_that_should_be_inaccessible.any?

    records_only_from_own_collections? || all_shares_have_a_permission_level_of_at_least?(level)
  end

  private

  def user_and_scope_present?
    user.present? && !records_scope.nil? && records_scope.is_a?(ActiveRecord::Relation)
  end

  def record_ids_from_own_collections
    @record_ids_from_own_collections ||= scope_for_own_records.ids
  end

  def record_ids_from_shared_collections
    @record_ids_from_shared_collections ||= scope_for_shared_records.ids
  end

  def record_ids_that_should_be_inaccessible
    @record_ids_that_should_be_inaccessible ||=
      records_scope.distinct.ids - record_ids_from_own_collections - record_ids_from_shared_collections
  end

  def records_only_from_own_collections?
    record_ids_from_shared_collections.none?
  end

  # A collection owned by one of the user's groups counts as their own, matching Collection#owned_by?,
  # writable_by and the group-aware WithdrawElements/RemoveElements use cases. Without the group ids
  # here, a group member acting on a group-owned collection would see every record fall through to
  # "inaccessible", so remove_all?/destroy_all? would wrongly deny an action the backend permits.
  def own_user_ids
    @own_user_ids ||= [user.id, *user.group_ids]
  end

  def scope_for_own_records
    records_scope.joins(:collections).where(collections: { user_id: own_user_ids }).distinct
  end

  def scope_for_shared_records
    records_scope
      .joins(collections: [:collection_shares])
      .where.not(collections: { user_id: own_user_ids }) # to prevent looking at circular shares
      .where(collection_shares: { shared_with_id: own_user_ids })
      .distinct
  end

  def records_table
    records_class.table_name
  end

  # this assumes that a given scope only contains records of the same kind!
  def records_class
    @records_class ||= records_scope.first.class
  end

  def all_shares_have_a_permission_level_of_at_least?(level)
    shared_record_ids_with_permission_levels = maximum_permission_levels_for_shared_records.keys.sort
    shared_record_ids_overall = record_ids_from_shared_collections.sort
    return false unless shared_record_ids_with_permission_levels == shared_record_ids_overall

    maximum_permission_levels_for_shared_records.values.all? { |v| v >= level }
  end

  def maximum_permission_levels_for_shared_records
    sql = Arel.sql(
      scope_for_shared_records
        .select("#{records_table}.id, MAX(collection_shares.permission_level) AS maximum_permission_level")
        .group("#{records_table}.id")
        .to_sql,
    )
    @maximum_permission_levels_for_shared_records ||= records_class.connection.execute(sql).to_h do |entry|
      [entry['id'], entry['maximum_permission_level']]
    end
  end
end
