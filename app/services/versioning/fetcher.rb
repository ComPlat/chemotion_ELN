# frozen_string_literal: true

module Versioning
  class Fetcher
    include ActiveModel::Model

    attr_accessor :record

    FETCHERS = {
      ::Collection => Versioning::Fetchers::CollectionFetcher,
      ::Sample => Versioning::Fetchers::SampleFetcher,
      ::Reaction => Versioning::Fetchers::ReactionFetcher,
      ::ResearchPlan => Versioning::Fetchers::ResearchPlanFetcher,
      ::Screen => Versioning::Fetchers::ScreenFetcher,
      ::Wellplate => Versioning::Fetchers::WellplateFetcher,
      ::DeviceDescription => Versioning::Fetchers::DeviceDescriptionFetcher,
    }.freeze

    def self.call(record)
      new(record: record).call
    end

    def call
      Versioning::Merger.call(versions: versions)
    end

    private

    def versions
      fetcher_class = FETCHERS[record.class]
      return [] unless fetcher_class

      fetcher_class.call(record.class.name.underscore.to_sym => record)
    end
  end
end
