# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Equipment < Base
        # This is just hardcoded definining the available equipment (in the RPE UI) depending on activity type.
        # These are subsets of OrdKit::Equipment::EquipmentType. It's important to use only constants fron
        # the ORD (else ORD export will eventually write 'UNSEPCIFIED' or raise an Error).
        #
        # We define this backend as some of it is retrieved directly from ORD constants which are unknown in RPE UI.

        def self.all
          titlecase_options_for(OrdKit::Equipment::EquipmentType.constants)
        end

        def self.per_activity_type
          {
            ADD: all,
            SAVE: [],
            TRANSFER: all,
            CONDITION: {
              EQUIPMENT: all,
              TEMPERATURE: temperature_equipment,
              PH: ph_adjust_equipment,
              PRESSURE: pressure_adjustment,
              IRRADIATION: irradiation_equipment,
              MOTION: motion_equipment,
            },
            REMOVE: remove_equipment,
            PURIFY: purify_equipment,
          }.deep_stringify_keys
        end

        def self.temperature_equipment
          titlecase_options_for(%w[HEATING_MANTLE BLOW_DRYER OIL_BATH ICE_BATH ALUMINIUM_BLOCK WATER_BATH
                                   SAND_BATH])
        end

        def self.pressure_adjustment
          titlecase_options_for(%w[REACTOR])
        end

        def self.ph_adjust_equipment
          titlecase_options_for(%w[PIPET])
        end

        def self.motion_equipment
          titlecase_options_for(%w[STIRRER SHAKER HEATING_SHAKER TUBE BALL_MILLING])
        end

        def self.irradiation_equipment
          titlecase_options_for(%w[ULTRA_SOUND_BATH UV_LAMP LED])
        end

        def self.remove_equipment
          titlecase_options_for(%w[PUMP TUBE COIL])
        end

        def self.purify_equipment
          titlecase_options_for(%w[FILTER SEPARATION_FILTER EXTRACTOR SPE_COLUMN FSPE_COLUMN
                                   FLASH_COLUMN DISTILLATION_APPARATUS SEPARATION_FUNNEL BUCHNER_FUNNEL])
        end
      end
    end
  end
end
