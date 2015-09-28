class SampleProxy
  def initialize(user)
    @user = user
  end

  def find(id)
    # calculate maximal detail level
    dl = detail_level_by_sample_id(id)

    # get attributes which should be blanked out


    # blank out respective serialization and return it
    s = SampleSerializer.new(Sample.find(id)).serializable_hash

    s[:name] = "***" # feld muss im frontend deaktiviert werden

    {sample: s}
  end

  private

  # TODO funktion f: Int -> [String], detail_level |-> blacklist
  def detail_level_by_sample_id(id)
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

  def collection_ids_by_sample_id(id)
    CollectionsSample.where(sample_id: id).pluck(:collection_id)
  end
end
