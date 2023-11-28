# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Equipment < Base
          def all
            titlecase_options_for(Clap::Equipment::EquipmentType.constants)
          end
        end
      end
    end
  end
end
