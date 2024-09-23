# frozen_string_literal: true

module Versioning
  class Fetcher
    include ActiveModel::Model

    attr_accessor :record

    def self.call(record)
      new(record: record).call
    end

    def call
      Versioning::Merger.call(versions: versions)
    end

    private

    def versions
      case record
      when ::Sample
        Versioning::Fetchers::SampleFetcher.call(sample: record)
      when ::Reaction
        Versioning::Fetchers::ReactionFetcher.call(reaction: record)
      when ::ResearchPlan
        Versioning::Fetchers::ResearchPlanFetcher.call(research_plan: record)
      when ::Screen
        Versioning::Fetchers::ScreenFetcher.call(screen: record)
      when ::Wellplate
        Versioning::Fetchers::WellplateFetcher.call(wellplate: record)
      end
    end
  end
end
