class ElementPermissionProxy
  attr_reader :user, :element

  def initialize(user, element)
    @user = user
    @element = element
  end

  def serialized
    serializer_class = serializer_class_by_element
    dl = detail_level_for_element

    unless dl == max_detail_level_by_element_class
      serialized_element = restriction_by_dl(serializer_class, dl).deep_symbolize_keys
    else
      serialized_element = serializer_class.new(element).serializable_hash.deep_symbolize_keys
    end
  end

  private

  def detail_level_for_element
    # on max level everything can be read
    max_detail_level = max_detail_level_by_element_class

    # get collections where sample belongs to
    c = user_collections_for_element

    # if user owns none of the collections which include the element, return minimum level
    return 0 if c.empty?

    # Fall 1: User gehört eine unshared Collection, die das Element enthält -> alles
    # Fall 2: User besitzt mindestens einen Share, der das Element enthält...von diesen Shares nutzt man das maximale
    # Element Detaillevel
    if c.pluck(:is_shared).map(&:!).any?
      max_detail_level
    else
      c.public_send(:pluck, "#{element.class.to_s.downcase}_detail_level").max
    end
  end

  def max_detail_level_by_element_class
    case element
    when Sample
      4
    when Reaction
      3
    when Wellplate
      3
    when Screen
      2
    end
  end

  def user_collections_for_element
    collection_ids = element.collections.pluck(:id)

    Collection.where("id IN (?) AND user_id = ?", collection_ids, user.id)
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
    end
  end

  def restriction_by_dl(serializer_class, dl)
    klass = "#{serializer_class}::Level#{dl}".constantize
    klass.new(element).serializable_hash
  end
end
