# frozen_string_literal: true

# rubocop:disable Metrics/ModuleLength, Naming/MethodParameterName, Layout/LineLength

module CollectionHelpers
  extend Grape::API::Helpers

  def fetch_by_collection_acl(id)
    current_user.acl_collection_by_id(id)
  end

  def check_permission_level_compatibility(collection, permission_level)
    collection_id = collection.id
    collection_permission_level =
      CollectionAcl.find_by(collection_id: collection_id, user_id: current_user.id)&.permission_level
    permission_level && collection_permission_level > permission_level
  end
  # return the collection if current_user is associated to it (owned) or if acl exists
  # return nil if no association

  def fetch_collections_w_current_user(collection_id, permission_level = nil)
    collections = Collection.owned_by(user_ids).where(id: collection_id)
    return collections if collections.present?

    collections = Collection.shared_with(user_ids).where(id: collection_id)
    return collections unless permission_level
    return unless check_permission_level_compatibility(collections&.first, permission_level)

    collections
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

  # desc: associate an element to 'All' collection of current_user
  def add_element_to_all_collection_of_current_user(element)
    all_collection = Collection.get_all_collection_for_user(current_user.id)
    add_element_to_a_collection(element, all_collection)
  end

  # desc: associate an element to a collection and the 'All' collection of the collection owner
  # or to the current_user All collection if no collection is provided
  def add_element_to_collection_n_all(element, collection)
    unless collection
      add_element_to_all_collection_of_current_user(element)
      return
    end
    add_element_to_a_collection(element, collection)
    # get the All collection of the collection owner
    all_collection = Collection.get_all_collection_for_user(collection.user_id)
    add_element_to_a_collection(element, all_collection)
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

    @dl = CollectionAcl::PERMISSION_LEVELS_MAX
    @dl = CollectionAcl.permission_levels_from_collections(c_id, user_ids) unless @is_owned
    @pl = @dl[:permission_level]
    @dl_s = @dl[:sample_detail_level]
    @dl_r = @dl[:reaction_detail_level]
    @dl_wp = @dl[:wellplate_detail_level]
    @dl_sc = @dl[:screen_detail_level]
    @dl_rp = @dl[:researchplan_detail_level]
    @dl_e = @dl[:element_detail_level]
    @dl_cl = @dl[:celllinesample_detail_level]
  end

  def create_acl_collection(user_id, collection_id, params)
    current_collection = params['ui_state']['currentCollection']
    label = params[:newCollection] || current_collection['label']

    c_acl = CollectionAcl.find_or_create_by(
      user_id: user_id,
      collection_id: collection_id,
    )
    c_acl.update!(
      label: label,
      permission_level: params['ui_state']['currentCollection']['permission_level'],
      sample_detail_level: params['ui_state']['currentCollection']['sample_detail_level'],
      reaction_detail_level: params['ui_state']['currentCollection']['reaction_detail_level'],
      wellplate_detail_level: params['ui_state']['currentCollection']['wellplate_detail_level'],
      screen_detail_level: params['ui_state']['currentCollection']['screen_detail_level'],
    )
  end

  def create_or_move_collection(action, from_collection, to_collection_id, ui_state)
    API::ELEMENTS.each do |element|
      next unless ui_state[element]

      element_state = check_ui_state(ui_state[element])
      next unless element_state[:checkedAll] || element_state[:checkedIds].present?

      ids = element_class_ids(element, from_collection.id, element_state)
      case action
      when 'move'
        join_element_class(element, 'collections').move_to_collection(ids, from_collection.id, to_collection_id)
      else
        join_element_class(element, 'collections').create_in_collection(ids, to_collection_id)
      end
    end
  end

  def check_ui_state(ui_state)
    ui_state[:checkedAll] = ui_state[:checkedAll] || ui_state[:all]
    ui_state[:checkedIds] = ui_state[:checkedIds].presence || ui_state[:included_ids]
    ui_state[:uncheckedIds] = ui_state[:uncheckedIds].presence || ui_state[:excluded_ids]
    ui_state
  end

  def create_elements(params, from_collection, to_collection_id)
    API::ELEMENTS.each do |element|
      ui_state = params[:ui_state][element]
      next unless ui_state

      ui_state = check_ui_state(ui_state)
      next unless ui_state[:checkedAll] || ui_state[:checkedIds].present?

      collections_element_klass = ('collections_' + element).classify.constantize # CollectionsSample
      element_klass = element.classify.constantize # Sample
      elements = element_klass.by_collection_id(from_collection.id).by_ui_state(ui_state)
      ids = elements.pluck(:id)
      case params[:action]
      when 'move'
        collections_element_klass.move_to_collection(ids, from_collection.id, to_collection_id)
      else
        collections_element_klass.create_in_collection(ids, to_collection_id)
      end
    end
  end

  def element_class_ids(element, from_collection_id, ui_state)
    element_class = API::ELEMENT_CLASS[element][:class]
    element_class.by_collection_id(from_collection_id).by_ui_state(ui_state).pluck(:id)
  end

  def join_element_class(element, join_table)
    element_class = API::ELEMENT_CLASS[element][:class]
    element_class.reflections[join_table].options[:through]&.to_s&.classify&.constantize
  end
end
# rubocop:enable Metrics/ModuleLength, Layout/LineLength
