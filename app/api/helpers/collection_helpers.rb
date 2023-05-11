module CollectionHelpers
  extend Grape::API::Helpers

  # desc: return the id of the source collection only if
  #  if current_user is associated to it (owned or shared)
  #  or to the sync_collections_user
  # return 0 if no association
  def fetch_collection_id_w_current_user(id)
    Collection.find_by(id: id.to_i, user_id: user_ids)
  end

  def fetch_collection_w_current_user(id, is_shared = false)
    collection = Collection.find_by(id: id.to_i, user_id: user_ids)

    if !collection.present?
      collection = Collection.joins(:collection_acls).includes(:user).where(
        'collection_acls.user_id in (?) and collection_acls.collection_id = ?', current_user.id, collection_id
      ).first
    end

    collection
  end

  # desc: given an id of coll or sync coll return detail levels as array
  def detail_level_for_collection(id, is_sync = false)
    dl = (is_sync && SyncCollectionsUser || Collection).find_by(
      id: id.to_i, user_id: user_ids
    )&.slice(
      :permission_level,
      :sample_detail_level, :reaction_detail_level,
      :wellplate_detail_level, :screen_detail_level,
      :researchplan_detail_level, :element_detail_level
    )&.symbolize_keys
    {
      permission_level: 0,
      sample_detail_level: 0,
      reaction_detail_level: 0,
      wellplate_detail_level: 0,
      screen_detail_level: 0,
      researchplan_detail_level: 0,
      element_detail_level: 0,
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
    collection = Collection.find_by(id: collection_id, user_id: current_user.id)

    if !collection.present?
      collection = Collection.joins(:collection_acls).includes(:user).where(
                     'collection_acls.user_id in (?) and collection_acls.collection_id = ? and collection_acls.permission_level >= ?',
                     current_user.id,
                     collection_id,
                     permission_level
                   ).first
    end
    collection
  end

  def fetch_source_collection_for_removal
    current_collection = params['ui_state']['currentCollection']
    fetch_collection_by_ui_state_params_and_pl(current_collection['id'], 3)
  end

  def fetch_source_collection_for_assign
    current_collection = params['ui_state']['currentCollection']
    fetch_collection_by_ui_state_params_and_pl(current_collection['id'], 2)
  end

  def set_var(c_id = params[:collection_id], is_sync = params[:is_sync])
    @c_id = fetch_collection_id_w_current_user(c_id)
    @c = Collection.find_by(id: @c_id)
    cu_id = current_user&.id
    @is_owned = cu_id && ((@c.user_id == cu_id && !@c.is_shared) || @c.shared_by_id == cu_id)

    @dl = {
      permission_level: 10,
      sample_detail_level: 10,
      reaction_detail_level: 10,
      wellplate_detail_level: 10,
      screen_detail_level: 10,
      researchplan_detail_level: 10,
      element_detail_level: 10,
    }

    @dl = detail_level_for_collection(c_id, is_sync) unless @is_owned
    @pl = @dl[:permission_level]
    @dl_s = @dl[:sample_detail_level]
    @dl_r = @dl[:reaction_detail_level]
    @dl_wp = @dl[:wellplate_detail_level]
    @dl_sc = @dl[:screen_detail_level]
    @dl_rp = @dl[:researchplan_detail_level]
    @dl_e = @dl[:element_detail_level]
  end

  def check_ui_state (ui_state)
    ui_state[:checkedAll] = ui_state[:checkedAll] || ui_state[:all]
    ui_state[:checkedIds] = ui_state[:checkedIds].presence || ui_state[:included_ids]
    ui_state[:uncheckedIds] = ui_state[:uncheckedIds].presence || ui_state[:excluded_ids]
    ui_state
  end

  def is_secret(collection)
    samples =   collection.samples
    reactions = collection.reactions
    wellplates = collection.wellplates
    screens = collection.screens

    top_secret_sample = samples.pluck(:is_top_secret).any?
    top_secret_reaction = reactions.flat_map(&:samples).map(&:is_top_secret).any?
    top_secret_wellplate = wellplates.flat_map(&:samples).map(&:is_top_secret).any?
    top_secret_screen = screens.flat_map(&:wellplates).flat_map(&:samples).map(&:is_top_secret).any?

    top_secret_sample || top_secret_wellplate || top_secret_reaction || top_secret_screen
  end

  def create_acl_collection(user_id, collection_id, params)
    currentCollection = params['ui_state']['currentCollection']
    label = params[:newCollection] || currentCollection['label']

    c_acl = CollectionAcl.find_or_create_by(
      user_id: user_id,
      collection_id: collection_id
    )
    c_acl.update(
      label: label,
      permission_level: currentCollection['permission_level'],
      sample_detail_level: currentCollection['sample_detail_level'],
      reaction_detail_level: currentCollection['reaction_detail_level'],
      wellplate_detail_level: currentCollection['wellplate_detail_level'],
      screen_detail_level: currentCollection['screen_detail_level'],
    )
  end

  def create_elements(params, from_collection, to_collection_id)
    API::ELEMENTS.each do |element|
      ui_state = params[:ui_state][element]
      next unless ui_state
      ui_state = check_ui_state(ui_state)
      next unless ui_state[:checkedAll] || ui_state[:checkedIds].present?

      collections_element_klass = ('collections_' + element).classify.constantize #CollectionsSample
      element_klass = element.classify.constantize #Sample
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

  def create_generic_elements(params, from_collection, to_collection_id)
    ElementKlass.find_each do |klass|
      ui_state = params[:ui_state][klass.name]
      next unless ui_state
      ui_state = check_ui_state(ui_state)
      next unless ui_state[:checkedAll] || ui_state[:checkedIds].present?

      ids = Element.by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
      case params[:action]
      when 'move'
        CollectionsElement.move_to_collection(ids, from_collection.id, to_collection_id, klass.name)
      else
        CollectionsElement.create_in_collection(ids, to_collection_id, klass.name)
      end
    end
  end
end
