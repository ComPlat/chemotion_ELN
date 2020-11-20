# frozen_string_literal: true

module DataCite
  class DataCiteDevice
    attr_reader :raw_response, :struct

    def initialize(raw_response)
      @raw_response = raw_response
      @struct = @raw_response.dup
    end

    def data
      @struct&.fetch('data', nil)
    end

    def doi
      data&.fetch('id', nil)
    end

    def attributes
      data&.fetch('attributes', nil)
    end

    def prefix
      attributes&.fetch('prefix', nil)
    end

    def suffix
      attributes&.fetch('suffix', nil)
    end

    def state
      attributes&.fetch('state', nil)
    end

    def title
      attributes&.fetch('titles', []).first&.fetch('title', nil)
    end

    def publisher
      attributes&.fetch('publisher', nil)
    end

    def description
      attributes&.fetch('descriptions', []).first&.fetch('description', nil)
    end

    def publication_year
      attributes&.fetch('publicationYear', nil)
    end

    def url
      attributes&.fetch('url', nil)
    end

    def content_url
      attributes&.fetch('contentUrl', nil)&.first
    end

    def landing_page_url
      attributes&.fetch('landingPage', nil)&.fetch('url', nil)
    end

    def dates
      attributes&.fetch('dates', nil)
    end

    def created
      return unless (created = attributes&.fetch('created', nil))

      DateTime.parse(created)
    end

    def updated
      return unless (updated = attributes&.fetch('updated', nil))

      DateTime.parse(updated)
    end

    def metadata_version
      attributes&.fetch('metadataVersion', nil)
    end
  end
end
