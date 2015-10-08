class ElementPermissionProxy
  attr_reader :user, :element

  def initialize(user, element)
    @user = user
    @element = element
  end

  def serialized
    serializer_class = serializer_class_by_element
    #serialized_element = serializer_instance_by_element.serializable_hash
    dl = detail_level_for_element

    unless dl == max_detail_level_by_element_class
      serialized_element = restriction_by_dl(serializer_class, dl)
      {element.class.to_s.downcase => serialized_element}.deep_symbolize_keys
    else
      serialized_element = serializer_class.new(element).serializable_hash
      {element.class.to_s.downcase => serialized_element}.deep_symbolize_keys
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
    allowed_attributes = allowed_attributes_for_dl(dl)
    serializer_class.new(element, only: allowed_attributes).serializable_hash
  end

  def allowed_attributes_for_dl(dl)
    case element
    when Sample
      allowed_sample_attributes_for_dl(dl)
    when Reaction
      allowed_reaction_attributes_for_dl(dl)
    when Wellplate
      allowed_wellplate_attributes_for_dl(dl)
    when Screen
      allowed_screen_attributes_for_dl(dl)
    end
  end

  def allowed_sample_attributes_for_dl(dl)
    basic_attributes = [:id, :type]

    case dl
    when 0
      basic_attributes +
      [
        :external_label,
        :amount_value,
        :amount_unit
      ]
    when 1
      basic_attributes +
      [
        :external_label,
        :molecule,
        :amount_value,
        :amount_unit
      ]
    when 2
      basic_attributes +
      [
        :external_label,
        :molecule,
        :amount_value,
        :amount_unit,
        :description,
        :analyses
      ]
    when 3

    end
  end
end
