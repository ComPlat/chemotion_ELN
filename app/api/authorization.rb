class Authorization
  def initialize(user, env, params)
    @user = user
    @env = env
    @params = params
  end

  def request_valid?
    request_method = @env['REQUEST_METHOD']

    case request_method
    when 'GET'
      get_request_valid?
    when 'POST'
      post_request_valid?
    when 'PUT'
      put_request_valid?
    when 'DELETE'
      Rails.logger.debug("Not implemented yet (also in API)")
      true
    else
      Rails.logger.debug("Request method not valid or supported.")
      false
    end
  end

  private

  # A GET request is valid if an user is owner of every requested collection (elements within) or
  # the user has shared this collection
  def get_request_valid?
    collections = requested_collections
    user_id = @user.id
    user_id_shared_by_id_tuples = collections.pluck(:user_id, :shared_by_id)

    user_id_shared_by_id_tuples.select { |x| x.first == user_id || x.second == user_id } == user_id_shared_by_id_tuples
  end

  # A PUT request is valid if an user owns all requested collections and all requested collections have at least the
  # permission level 1 (write)
  def put_request_valid?
    collections = requested_collections
    permission_levels = collections.pluck(:permission_level)

    @user.owns_collections?(collections) && (permission_levels.min >= 1)
  end

  # A POST request is always (?) valid if an user wants to create a new element; Sharing is allowed if the user
  # owns all requested collections and has at least permission level 2 for all of them; or he is the creator of all
  # checked elements
  def post_request_valid?
    return true unless request_to_sharing_endpoint?

    collections = requested_collections

    @user.owns_unshared_collections?(collections) || (@user.owns_collections?(collections) && collections.pluck(:permission_level).min >= 2)
  end

  def requested_collections
    # TODO wie heißt params sonst für mehrere collections?
    collection_ids = @params[:collection_ids] || [@params[:collection_id]]
    Collection.where(id: collection_ids)
  end

  def request_to_sharing_endpoint?
    @env['REQUEST_PATH'] == "/api/v1/collections/shared"
  end
end
