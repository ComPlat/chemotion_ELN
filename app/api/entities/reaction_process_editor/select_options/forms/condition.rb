# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Condition < Base
          GLOBAL_DEFAULTS = {
            TEMPERATURE: { value: '21', unit: 'CELSIUS' },
            PRESSURE: { value: '1013', unit: 'MBAR' },
            PH: { value: 7, unit: 'PH' },
            IRRADIATION: {},
            MOTION: {},
            EQUIPMENT: {},
          }.deep_stringify_keys

          def select_options
            {
              additional_information: additional_information,
              equipment: {
                EQUIPMENT: SelectOptions::Models::Equipment.instance.all,
                TEMPERATURE: temperature_equipment,
                PH: ph_adjust_equipment,
                PRESSURE: pressure_adjustment,
                IRRADIATION: irradiation_equipment,
                MOTION: motion_equipment,
              },
            }
          end

          def additional_information
            {
              TEMPERATURE: additional_information_temperature,
              PH: additional_information_ph,
              PRESSURE: [],
              IRRADIATION: additional_information_irradiation,
            }
          end

          private

          def additional_information_temperature
            [
              { value: 'UNSPECIFIED', label: 'Unspecified' },
              { value: 'CUSTOM', label: 'Custom' },
              { value: 'AMBIENT', label: 'Room Temperature' },
              { value: 'OIL_BATH', label: 'Temp of Oil Bath' },
              { value: 'WATER_BATH', label: 'Water Bath' },
              { value: 'SAND_BATH', label: 'Sand Bath' },
              { value: 'ICE_BATH', label: 'Ice Bath' },
              { value: 'DRY_ALUMINUM_PLATE', label: 'Dry Aluminium Plate' },
              { value: 'MICROWAVE', label: 'Microwave' },
              { value: 'DRY_ICE_BATH', label: 'Dry Ice Bath' },
              { value: 'AIR_FAN', label: 'Air Fan' },
              { value: 'LIQUID_NITROGEN', label: 'Liquid Nitrogen' },
              { value: 'ANALYSIS_IN_REACTION', label: 'Analysis in Reaction' },
              { value: 'CONTACT_MEDIUM', label: 'Temp of other contact Media' },
            ]
          end

          def additional_information_ph
            [
              { value: 'PH_ELECTRODE', label: 'pH Electrode' },
              { value: 'PH_STRIPE', label: 'pH Stripe' },
              { value: 'PH_OTHER', label: 'Other' },
            ]
          end

          def additional_information_irradiation
            [
              { value: 'UNSPECIFIED', label: 'Unspecified' },
              { value: 'LED', label: 'LED' },
              { value: 'MICROWAVE_REACTOR', label: 'Microwave Reactor' },
              { value: 'LAMP', label: 'Lamp' },
              { value: 'LASER', label: 'Laser' },
              { value: 'CUSTOM', label: 'Custom' },
              { value: 'AMBIENT', label: 'Ambient' },
              { value: 'HALOGEN_LAMP', label: 'Halogen Lamp' },
              { value: 'DEUTERIUM_LAMP', label: 'Deuterium Lamp' },
              { value: 'SOLAR_SIMULATOR', label: 'Solar Simulator' },
              { value: 'BROAD_SPECTRUM', label: 'Broad Spectrum' },
              { value: 'DARK', label: 'Dark' },
            ]
          end

          def temperature_equipment
            titlecase_options_for(%w[HEATING_MANTLE BLOW_DRYER OIL_BATH ICE_BATH ALUMINIUM_BLOCK WATER_BATH
                                     SAND_BATH])
          end

          def pressure_adjustment
            titlecase_options_for(%w[REACTOR])
          end

          def ph_adjust_equipment
            titlecase_options_for(%w[PIPET])
          end

          def motion_equipment
            titlecase_options_for(%w[STIRRER SHAKER HEATING_SHAKER TUBE BALL_MILLING])
          end

          def irradiation_equipment
            titlecase_options_for(%w[ULTRA_SOUND_BATH UV_LAMP LED])
          end
        end
      end
    end
  end
end
