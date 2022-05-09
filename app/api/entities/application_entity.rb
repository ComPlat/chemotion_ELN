# frozen_string_literal: true

module Entities
  class ApplicationEntity < Grape::Entity
    format_with(:eln_timestamp) do |datetime|
      I18n.l(datetime, format: :eln_timestamp)
    end
  end
end
