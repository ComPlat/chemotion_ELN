module Entities
  class DeviceMetadataEntity < Grape::Entity
    expose :id, documentation: { type: 'Integer', desc: 'metadata id'}
    expose :device_id, documentation: { type: 'String', desc: 'metadata id'}
    expose :name, documentation: { type: 'String', desc: 'device name' }
    expose :doi, documentation: { type: 'String', desc: 'device doi' }
    expose :url, documentation: { type: 'String', desc: 'device url' }
    expose :landing_page, documentation: { type: 'String', desc: 'device landing_page' }
    expose :type, documentation: { type: 'String', desc: 'device type' }
    expose :description, documentation: { type: 'String', desc: 'device description' }
    expose :publisher, documentation: { type: 'String', desc: 'device publisher' }
    expose :publication_year, documentation: { type: 'Integer', desc: 'device publication year' }

    expose :owners, documentation: { desc: 'device owners' }
    expose :manufacturers, documentation: { desc: 'device manufacturers' }
    expose :dates, documentation: { desc: 'device dates' }

    expose :data_cite_prefix, documentation: { type: 'String', desc: 'DataCite prefix' }
    expose :data_cite_state, documentation: { type: 'String', desc: 'DataCite state' }
    expose :data_cite_created_at, documentation: { type: 'DateTime', desc: 'created_at DataCite ' }
    expose :data_cite_updated_at, documentation: { type: 'DateTime', desc: 'updated_at DataCite' }
    expose :data_cite_version, documentation: { type: 'Integer', desc: 'version at DataCite' }

    def data_cite_created_at
      object.data_cite_created_at.present? ? I18n.l(object.data_cite_created_at, format: :eln_timestamp) : nil
    end

    def data_cite_updated_at
      object.data_cite_updated_at.present? ? I18n.l(object.data_cite_updated_at, format: :eln_timestamp) : nil
    end
  end
end
