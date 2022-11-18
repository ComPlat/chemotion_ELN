# frozen_string_literal: true

module DataCite
  class Syncer
    attr_reader :converter
    DATA_CITE_PREFIX = ENV['DATA_CITE_PREFIX']

    class UnwriteableDoiPrefixError < StandardError; end

    def initialize(chemotion_device)
      @chemotion_metadata = chemotion_device.device_metadata
      @date_cite_device = nil
      @client = Client.new
      @converter = Converter.new(@chemotion_metadata)
    end

    def find_and_create_at_chemotion!
      if fetch_from_data_cite
        create_at_chemotion!
      else
        @chemotion_metadata.generate_doi!
      end
    end

    def sync_to_data_cite!
      return false if @chemotion_metadata.doi.blank?
      raise UnwriteableDoiPrefixError if @chemotion_metadata.data_cite_prefix != DATA_CITE_PREFIX

      create_at_data_cite! unless fetch_from_data_cite

      update_at_data_cite!
      update_at_chemotion!
    end

    private

    def fetch_from_data_cite
      return false if @chemotion_metadata.doi.blank?

      data_cite_response = @client.get(@chemotion_metadata.doi)
      @converter.init_data_cite_device_from_response(data_cite_response)
    rescue Client::NotFoundError
      false
    end

    def create_at_data_cite!
      data_cite_response = @client.create(@converter.to_data_cite_for_create)
      @converter.init_data_cite_device_from_response(data_cite_response)
    end

    def update_at_data_cite!
      data_cite_response =
        @client.update(@chemotion_metadata.doi, @converter.to_data_cite_for_update)
      @converter.init_data_cite_device_from_response(data_cite_response)
    end

    def create_at_chemotion!
      @chemotion_metadata.update!(@converter.to_chemotion_for_create)
    end

    def update_at_chemotion!
      @chemotion_metadata.update!(@converter.to_chemotion_for_update)
    end
  end
end
