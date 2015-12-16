module ReallyDestroyTask
  def self.execute!
    models.each do |model|
      model.constantize.only_deleted.map(&:really_destroy!)
    end
  end

  def self.models
    %w(Collection CollectionsReaction CollectionsSample CollectionsScreen
    CollectionsWellplate ScreensWellplate ReactionsProductSample Sample
    Reaction ReactionsReactantSample ReactionsStartingMaterialSample
    Literature Molecule Wellplate Screen Well User)
  end
end
