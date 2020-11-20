# frozen_string_literal: true

module DataCite
  class Converter
    attr_reader :data_cite_device, :chemotion_metadata
    DATA_CITE_DEVICE_PUBLISHER = ENV['DATA_CITE_DEVICE_PUBLISHER']
    DATA_CITE_DEVICE_CREATOR = ENV['DATA_CITE_DEVICE_CREATOR']

    def initialize(chemotion_metadata)
      @chemotion_metadata = chemotion_metadata
      @data_cite_device = nil
    end

    def init_data_cite_device_from_response(data_cite_response)
      @data_cite_device = DataCiteDevice.new(data_cite_response)
    end

    def to_data_cite_for_create
      {
        data: {
          type: 'dois',
          attributes: {
            doi: @chemotion_metadata.doi,
            titles: [
              {
                title: @chemotion_metadata.name
              }
            ]
          }
        }
      }
    end

    def to_data_cite_for_update
      {
        data: {
          type: 'dois',
          attributes: {
            titles: [
              {
                title: tune(@chemotion_metadata.name)
              }
            ],
            publisher: DATA_CITE_DEVICE_PUBLISHER,
            descriptions: [
              { description: tune(@chemotion_metadata.description) }
            ],
            publicationYear: tune(@chemotion_metadata.publication_year),
            url: tune(@chemotion_metadata.url),
            landingPage: { url: tune(@chemotion_metadata.landing_page) },
            dates: (@chemotion_metadata.dates || []),
            types: {
              resourceType: 'Service',
              resourceTypeGeneral: 'Service'
            },
            creators: [
              {
                name: DATA_CITE_DEVICE_CREATOR
              }
            ],
            subjects: [
              { subject: 'Chemistry' }
            ],
            language: 'en',
            geoLocations: [],
            rightsList: [],
            alternateIdentifiers: [],
            contributors: []
          }.merge(event_data_for_data_cite)
        }
      }
    end

    def event_data_for_data_cite
      case @chemotion_metadata.data_cite_state
      when 'draft'
        {}
      when 'registered'
        { event: 'register' }
      when 'findable'
        { event: 'publish' }
      else
        {}
      end
    end

    def to_chemotion_for_create
      {
        doi: @data_cite_device.doi,
        data_cite_prefix: @data_cite_device.prefix,
        name: @data_cite_device.title,
        publisher: @data_cite_device.publisher,
        description: @data_cite_device.description,
        publication_year: @data_cite_device.publication_year,
        url: @data_cite_device.url,
        landing_page: @data_cite_device.landing_page_url,
        dates: @data_cite_device.dates,
      }.merge(to_chemotion_for_update)
    end

    def to_chemotion_for_update
      {
        data_cite_last_response: @data_cite_device.raw_response,
        data_cite_created_at: @data_cite_device.created,
        data_cite_updated_at: @data_cite_device.updated,
        data_cite_version: @data_cite_device.metadata_version,
        data_cite_state: @data_cite_device.state
      }
    end

    def tune(value)
      value.presence
      # .try(&:strip)
    end
  end
end
