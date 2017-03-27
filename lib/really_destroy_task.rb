module ReallyDestroyTask
  def self.execute!
    models.each do |model|
      model.constantize.only_deleted.where('deleted_at <= :eight_days_ago', eight_days_ago: Time.now - 8.days).map(&:really_destroy!)
    end
  end

  def self.models
    %w(Collection CollectionsReaction CollectionsSample CollectionsScreen
    CollectionsWellplate ScreensWellplate ReactionsProductSample Sample
    Reaction ReactionsReactantSample ReactionsStartingMaterialSample
    Literature Molecule Wellplate Screen Well User CodeLog)
  end
end
