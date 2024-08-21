# frozen_string_literal: true

module Entities
  class ThirdPartyAppEntity < Grape::Entity
    expose :id, documentation: { type: 'Integer', desc: 'Third party app id' }
    expose :url, documentation: { type: 'String', desc: 'Third party app URL' }
    expose :name, documentation: { type: 'String', desc: 'Third party app name' }
    expose :file_types, as: :fileTypes,
                        documentation: {
                          type: 'String', desc: 'comma separated File types supported by the third party app'
                        }
  end
end
