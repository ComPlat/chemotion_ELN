# frozen_string_literal: true

module Versioning
  class Fetcher
    include ActiveModel::Model

    attr_accessor :record

    FETCHERS = {
      'Sample' => ->(record) { Versioning::Fetchers::SampleFetcher.call(sample: record) },
      'Reaction' => ->(record) { Versioning::Fetchers::ReactionFetcher.call(reaction: record) },
      'ResearchPlan' => ->(record) { Versioning::Fetchers::ResearchPlanFetcher.call(research_plan: record) },
      'Screen' => ->(record) { Versioning::Fetchers::ScreenFetcher.call(screen: record) },
      'Wellplate' => ->(record) { Versioning::Fetchers::WellplateFetcher.call(wellplate: record) },
      'DeviceDescription' => lambda { |record|
        Versioning::Fetchers::DeviceDescriptionFetcher.call(device_description: record)
      },
      'CelllineSample' => ->(record) { Versioning::Fetchers::CelllineSampleFetcher.call(cellline_sample: record) },
    }.freeze

    def self.call(record)
      new(record: record).call
    end

    def call
      Versioning::Merger.call(versions: versions)
    end

    private

    def versions
      FETCHERS[record.class.name]&.call(record)
    end
  end
end
