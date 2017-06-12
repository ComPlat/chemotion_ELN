class ElementPermissionProxy
  attr_reader :user, :element, :detail_level

  def initialize(user, element, user_ids = [])
    @user = user
    @element = element
    @user_ids = user_ids

    @collections = user_collections_for_element
    @sync_collections = sync_collections_users_for_element
    @detail_level = detail_level_for_element
  end

  def serialized
    serializer_class = serializer_class_by_element
    nested_dl = nested_details_levels_for_element
    serialized_element = restriction_by_dl(
      serializer_class,
      detail_level,
      nested_dl
    ).deep_symbolize_keys
  end

  def read_dataset?
    detail_level >= 3
  end

  private

  def detail_level_for_element
    # on max level everything can be read
    max_detail_level = max_detail_level_by_element_class
    # get collections where element belongs to
    c = @collections
    sc= @sync_collections
    # if user owns none of the collections which include the element, return minimum level
    @dl = 0
    return @dl if c.empty? && sc.empty?

    # Fall 1: User gehört eine unshared Collection, die das Element enthält -> alles
    # Fall 2: User besitzt mindestens einen Share, der das Element enthält...von diesen Shares nutzt man das maximale
    # Element Detaillevel

    c.map { |cc| [cc.is_shared, cc.send("#{element.class.to_s.downcase}_detail_level")] }.each do |bool, dl|
      return (@dl = max_detail_level) if !bool
      @dl = dl if dl > @dl
    end

    sc.each do |sc|
      dl = sc.send("#{element.class.to_s.downcase}_detail_level")
      @dl = dl if dl > @dl
    end

    @dl

  end

  def nested_details_levels_for_element
    nested_detail_levels = {}
    c = @collections.map { |c| [c.sample_detail_level, c.wellplate_detail_level] } || []
    sc= @sync_collections.map { |sc| [sc.sample_detail_level, sc.wellplate_detail_level] } || []
    s_dl,w_dl= 0,0
    if element.is_a?(Sample)
      nested_detail_levels[:sample] = @dl
      nested_detail_levels[:wellplate] = (
        @collections.map { |c| [c.wellplate_detail_level] } +
        @sync_collections.map { |c| [c.wellplate_detail_level] }
        ).max
    else
      (c+sc).each do |dls|
        s_dl < dls[0] && (s_dl = dls[0])
        w_dl < dls[1] && (w_dl = dls[1])
      end
      nested_detail_levels[:sample], nested_detail_levels[:wellplate] = s_dl, w_dl
    end
    nested_detail_levels
  end

  def max_detail_level_by_element_class
    case element
    when Sample
      10
    when Reaction
      10
    when Wellplate
      10
    when Screen
      10
    when ResearchPlan
      10
    end
  end

  def user_collections_for_element
  #    collection_ids = element.collections.pluck(:id)
  #    Collection.where("id IN (?) AND user_id IN (?)", collection_ids, @user_ids)
    element.collections.select { |c| @user_ids.include?(c.user_id) }
  end
  def sync_collections_users_for_element
    coll_ids = element.collections.map(&:id)
    element.collections.map(&:sync_collections_users).flatten.select do |sc|
      @user_ids.include?(sc.user_id) && coll_ids.include?(sc.collection_id)
    end
  end

  def serializer_class_by_element
    case element
    when Sample
      SampleSerializer
    when Reaction
     ReactionSerializer
    when Wellplate
      WellplateSerializer
    when Screen
      ScreenSerializer
    when ResearchPlan
      ResearchPlanSerializer
    end
  end

  def restriction_by_dl(serializer_class, dl, nested_dl)
    klass = "#{serializer_class}::Level#{dl}".constantize
    klass.new(element, nested_dl).serializable_hash
  end
end
