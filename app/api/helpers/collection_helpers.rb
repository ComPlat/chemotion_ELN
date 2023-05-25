# frozen_string_literal: true

# rubocop:disable Metrics/ModuleLength, Style/OptionalBooleanParameter, Naming/MethodParameterName, Layout/LineLength

module CollectionHelpers
  extend Grape::API::Helpers

  def fetch_by_collection_acl(id)
    current_user.acl_collection_by_id(id)
  end

  # return the collection if current_user is associated to it (owned) or if acl exists
  # return nil if no association
  def fetch_collections_w_current_user(collection_id, permission_level = nil)
    collections = Collection.owned_by(user_ids).where(id: collection_id)
    return collections if collections.present?

    Collection.shared_with(user_ids, permission_level).where(id: collection_id)
  end

  def fetch_collection_w_current_user(collection_id, permission_level = nil)
    collections = fetch_collections_w_current_user(collection_id, permission_level)
    collections.first
  end

  # desc: associate an element to a collection
  # do not raise error if element is already associated to the collection
  def add_element_to_a_collection(element, collection)
    element.collections << collection
  rescue ActiveRecord::RecordNotUnique
  end

  # desc: given an id of coll or sync coll return detail levels as array
  def detail_level_for_collection(id, is_sync = false)
    dl = ((is_sync && SyncCollectionsUser) || Collection).find_by(
      id: id.to_i, user_id: user_ids,
    )&.slice(
      :permission_level,
      :sample_detail_level, :reaction_detail_level,
      :wellplate_detail_level, :screen_detail_level,
      :researchplan_detail_level, :element_detail_level,
      :celllinesample_detail_level
    )&.symbolize_keys
    {
      permission_level: 0,
      sample_detail_level: 0,
      reaction_detail_level: 0,
      wellplate_detail_level: 0,
      screen_detail_level: 0,
      researchplan_detail_level: 0,
      element_detail_level: 0,
      celllinesample_detail_level: 0,
    }.merge(dl || {})
  end

  # TODO: DRY fetch_collection_id_for_assign & fetch_collection_by_ui_state_params_and_pl
  # desc: return a collection id to which elements (eg samples) shld be assigned
  # if current user is entitled to write into the destination collection
  def fetch_collection_id_for_assign(params, permission_level = 1)
    c_id = params[:collection_id] || params['ui_state']['currentCollection']['id']

    c = if !params[:newCollection].blank?
          collection_attributes = @params.fetch(:collection_attributes, {})
                                         .merge(user_id: current_user.id, label: params[:newCollection])
          Collection.create(collection_attributes)
        else
          fetch_collection_by_ui_state_params_and_pl(c_id, 1)
        end

    c&.id
  end

  def fetch_collection_by_ui_state_params_and_pl(collection_id, permission_level = 2)
    fetch_collection_w_current_user(collection_id, permission_level)
  end

  def fetch_source_collection_for_removal
    current_collection = params['ui_state']['currentCollection']
    fetch_collection_by_ui_state_params_and_pl(current_collection['id'], 3)
  end

  def fetch_source_collection_for_assign
    current_collection = params['ui_state']['currentCollection']
    fetch_collection_by_ui_state_params_and_pl(current_collection['id'], 2)
  end

  def set_var(c_id = params[:collection_id])
    @c = fetch_collection_w_current_user(c_id)
    @c_id = @c&.id
    cu_id = current_user&.id
    @is_owned = cu_id && (@c.user_id == cu_id)

    @dl = CollectionAcl.PERMISSION_LEVELS_MAX
    @dl = CollectionAcl.max_permissions_levels_from_collections(c_id, user_ids) unless @is_owned
    @pl = @dl[:permission_level]
    @dl_s = @dl[:sample_detail_level]
    @dl_r = @dl[:reaction_detail_level]
    @dl_wp = @dl[:wellplate_detail_level]
    @dl_sc = @dl[:screen_detail_level]
    @dl_rp = @dl[:researchplan_detail_level]
    @dl_e = @dl[:element_detail_level]
    @dl_cl = @dl[:celllinesample_detail_level]
  end

  def element_class_ids(element, join_table, from_collection_id, ui_state)
    element_class = API::ELEMENT_CLASS[element]
    element_class.reflections[join_table].options[:through]&.to_s&.classify&.constantize
    element_class.by_collection_id(from_collection_id).by_ui_state(ui_state).pluck(:id)
  end

  def join_element_class(element, join_table)
    element_class = API::ELEMENT_CLASS[element]
    element_class.reflections[join_table].options[:through]&.to_s&.classify&.constantize
  end
end
# rubocop:enable Metrics/ModuleLength, Style/OptionalBooleanParameter, Naming/MethodParameterName, Layout/LineLength
