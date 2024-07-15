# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Conditions < Base
        GLOBAL_DEFAULTS = {
          TEMPERATURE: { value: '21', unit: 'CELSIUS' },
          PRESSURE: { value: '1013', unit: 'MBAR' },
          PH: { value: 7, unit: 'PH' },
          IRRADIATION: {},
          MOTION: {},
          EQUIPMENT: {},
        }.deep_stringify_keys

        def additional_information
          {
            TEMPERATURE: additional_information_temperature,
            PH: additional_information_ph,
            PRESSURE: [],
            IRRADIATION: additional_information_irradiation,
          }
        end

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
            { value: 'MEASUREMENT_IN_REACTION', label: 'Measurement in Reaction' },
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
      end
    end
  end
end
