# frozen_string_literal: true

class Versioning::Fetchers::CollectionFetcher
  include ActiveModel::Model

  attr_accessor :collection

  def self.call(**args)
    new(**args).call
  end

  def call
    Versioning::Serializers::CollectionSerializer.call(collection)
  end
end
