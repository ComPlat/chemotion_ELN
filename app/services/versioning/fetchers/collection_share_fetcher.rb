# frozen_string_literal: true

class Versioning::Fetchers::CollectionShareFetcher
  include ActiveModel::Model

  attr_accessor :collection_share

  def self.call(**args)
    new(**args).call
  end

  def call
    Versioning::Serializers::CollectionShareSerializer.call(collection_share)
  end
end
