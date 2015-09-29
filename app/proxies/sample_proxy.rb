class SampleProxy
  def initialize(user)
    @user = user
  end

  def find(id)
    s = SampleSerializer.new(Sample.find(id)).serializable_hash.deep_symbolize_keys

    # calculate maximal detail level
    dl = detail_level_by_sample_id(id)

    unless dl == 4
      # get attributes which are allowed to be seen
      sample_attr = allowed_sample_attributes_for_detail_level(dl)

      # blank out respective serialization and return it
      new_sample_hash = {}
      sample_attr.each do |attr|
        new_sample_hash[attr] = s[attr]
      end
      new_sample_hash[:is_scoped] = true

      {sample: new_sample_hash}
    else
      {sample: s}
    end
  end

  private

  def detail_level_by_sample_id(id)
    # on level 4 everything can be read
    max_detail_level = 4

    # get collections where sample belongs to
    c = Collection.where("id IN (?) AND user_id = ?", collection_ids_by_sample_id(id), @user.id)

    # if user owns none of the collections which include the sample, return minimum level
    return 0 if c.empty?

    # Fall 1: User gehört eine unshared Collection, die das Sample enthält -> alles
    # Fall 2: User besitzt mindestens einen Share, der das Sample enthält...von diesen Shares nutzt man das maximale
    # Sample Detaillevel
    if c.pluck(:is_shared).map(&:!).any?
      max_detail_level
    else
      c.pluck(:sample_detail_level).max
    end
  end

  def allowed_sample_attributes_for_detail_level(level)
    case level
    when 0
      [
        :id,
        :type,
        #:weight
      ]
    when 1
      [
        :id,
        :type,
        :molecule
      ]
    when 2

    when 3

    end
  end

  def collection_ids_by_sample_id(id)
    CollectionsSample.where(sample_id: id).pluck(:collection_id)
  end
end
