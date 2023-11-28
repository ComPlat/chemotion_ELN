# frozen_string_literal: true

require 'singleton'

# rubocop: disable Metrics/ClassLength
module ReactionProcessEditor
  class SelectOptions
    include Singleton
    # This is just hardcoded definining the available equipment (in the RPE UI) depending on action type.
    # These are subsets of OrdKit::Equipment::EquipmentType. It's important to use only constants fron
    # the ORD (else ORD export will eventually write 'UNSEPCIFIED').
    #
    # We define this backend as some of it is retrieved directly from ORD constants which are unknown in RPE UI.

    def all_ord_equipment
      @all_ord_equipment ||= options_for(OrdKit::Equipment::EquipmentType.constants)
    end

    def action_type_equipment
      @action_type_equipment ||= {
        ADD: all_ord_equipment,
        SAVE: [],
        TRANSFER: all_ord_equipment,
        CONDITION: {
          EQUIPMENT: all_ord_equipment,
          TEMPERATURE: temperature_equipment_options,
          PH: ph_adjust_equipment_options,
          PRESSURE: pressure_adjustment_options,
          IRRADIATION: irradiation_equipment_options,
          MOTION: motion_equipment_options,
        },
        REMOVE: remove_equipment_options,
        PURIFY: purify_equipment_options,
      }.deep_stringify_keys
    end

    def condition_additional_information
      @condition_additional_information ||=
        {
          TEMPERATURE: temperature_additional_information_options,
          PH: ph_additional_information_options,
          PRESSURE: [],
          IRRADIATION: irradiation_additional_information_options,
        }
    end

    def global_default_conditions
      # Hardcoded Default conditions are stored backend as we enable user- and reaction specific
      # conditions. Conveniently sort of misplaced in "SelectOptions".
      @global_default_conditions ||= {
        TEMPERATURE: { value: '21', unit: 'CELSIUS' },
        PRESSURE: { value: '1013', unit: 'MBAR' },
        PH: { value: 7, unit: 'PH' },
        IRRADIATION: {},
        MOTION: {},
        EQUIPMENT: {},
      }.deep_stringify_keys
    end

    def addition_speed_types
      options_for(OrdKit::ReactionInput::AdditionSpeed::AdditionSpeedType.constants)
    end

    def preparation_types
      options_for(%w[DISSOLVED HOMOGENIZED TEMPERATURE_ADJUSTED DEGASSED]) +
        [{ value: 'DRIED', label: 'Drying' }]
    end

    def crystallization_modes
      [
        { value: 'NONE', label: 'None' },
        { value: 'COLD', label: 'Cold' },
        { value: 'HOT', label: 'Hot' },
      ]
    end

    def filtration_modes
      [{ value: 'KEEP_SUPERNATANT', label: 'Supernatant' },
       { value: 'KEEP_PRECIPITATE', label: 'Precipitate' }]
    end

    def automation_modes
      [{ value: 'MANUAL', label: 'Manual' },
       { value: 'AUTOMATED', label: 'Automated' }]
    end

    def chromatography_automation_modes
      [{ value: 'MANUAL', label: 'Manual' },
       { value: 'SEMI_AUTOMATED', label: 'Semi-Automated' },
       { value: 'AUTOMATED', label: 'Automated' }]
    end

    def chromatography_step_modes
      [{ value: 'EQUILIBRIUM', label: 'Equilibrium' },
       { value: 'SEPARATION', label: 'Separation' },
       { value: 'AFTER_RUN', label: 'After Run' }]
    end

    def chromatography_prod_modes
      [{ value: 'ANY', label: 'Any' },
       { value: 'PROD', label: 'Prod' },
       { value: 'NONE', label: 'No' }]
    end

    def chromatography_jar_materials
      [{ value: 'GLASS', label: 'Glass' },
       { value: 'METAL', label: 'Metal' }]
    end

    def chromatography_devices
      [{ value: 'HPLC', label: 'HPLC' },
       { value: 'MPLC', label: 'MPLC' },
       { value: 'SFC', label: 'SFC' }]
    end

    def chromatography_column_types
      [{ value: 'HPLC', label: 'List' },
       { value: 'MPLC', label: 'Yet' },
       { value: 'SFC', label: 'Undefined' }]
    end

    def chromatography_detectors
      [
        { value: 'UNSPECIFIED', label: 'Unspecified' },
        { value: 'CUSTOM', label: 'Custom' },
        { value: 'LC', label: 'LC' },
        { value: 'GC', label: 'GC' },
        { value: 'IR', label: 'IR' },
        { value: 'NMR_1H', label: 'NMR 1H' },
        { value: 'NMR_13C', label: 'NMR 13C' },
        { value: 'NMR_OTHER', label: 'NMR Other' },
        { value: 'MP', label: 'MP' },
        { value: 'UV', label: 'UV' },
        { value: 'TLC', label: 'TLC' },
        { value: 'MS', label: 'MS' },
        { value: 'HRMS', label: 'HRMS' },
        { value: 'MSMS', label: 'MSMS' },
        { value: 'WEIGHT', label: 'Weight' },
        { value: 'LCMS', label: 'LCMS' },
        { value: 'GCMS', label: 'GCMS' },
        { value: 'ELSD', label: 'ELSD' },
        { value: 'CD', label: 'CD' },
        { value: 'SFC', label: 'SFC' },
        { value: 'EPR', label: 'EPR' },
        { value: 'XRD', label: 'XRD' },
        { value: 'RAMAN', label: 'RAMAN' },
        { value: 'ED', label: 'ED' },
        { value: 'HPLC', label: 'HPLC' },
      ]
    end

    def extraction_phases
      [{ value: 'AQUEOUS', label: 'Aqueous' },
       { value: 'ORGANIC', label: 'Organic' }]
    end

    def motion_types
      [{ value: 'UNSPECIFIED', label: 'Motion Unspecified' },
       { value: 'CUSTOM', label: 'Motion Custom' },
       { value: 'NONE', label: 'Motion None' },
       { value: 'STIR_BAR', label: 'Stir' },
       { value: 'OVERHEAD_MIXER', label: 'Overhead Mixer' },
       { value: 'AGITATION', label: 'Shake' },
       { value: 'BALL_MILLING', label: 'Ball Milling' },
       { value: 'SONICATION', label: 'Sonication' },
       { value: 'OTHER', label: 'Motion' }]
    end

    def remove_sample_types
      [{ value: 'MEDIUM', label: 'Medium' },
       { value: 'ADDITIVE', label: 'Solvent (Evaporate)' },
       { value: 'DIVERSE_SOLVENT', label: 'Diverse Solvent' }]
    end

    def save_sample_types
      [{ value: 'CRUDE', label: 'Crude' },
       { value: 'MIXTURE', label: 'Mixture' },
       { value: 'INTERMEDIATE', label: 'Intermediate' }]
    end

    def analysis_types
      [{ value: 'TLC', label: 'Thin Layer Chromatography (TLC)' },
       { value: 'GC', label: 'Gas Chromatography (GC)' },
       { value: 'HPLC', label: 'High Performance Liquid Chromatography (HPLC)' },
       { value: 'GCMS', label: 'Combined GC/MS (GC/MS)' },
       { value: 'LCMS', label: 'Combined LC/MS (LCMS)' }]
    end

    private

    # options_for can be used where every value.to_titlecase yields a useful label (e.g. DISSOLVED -> Dissolved)
    # but some dont't which we then need to define explizitly hardcoded.
    def options_for(string_array)
      string_array.map do |string|
        { value: string.to_s, label: string.to_s.titlecase }
      end
    end

    def temperature_equipment_options
      options_for(%w[HEATING_MANTLE BLOW_DRYER OIL_BATH ICE_BATH ALUMINIUM_BLOCK WATER_BATH
                     SAND_BATH])
    end

    def pressure_adjustment_options
      options_for(%w[REACTOR])
    end

    def ph_adjust_equipment_options
      options_for(%w[PIPET])
    end

    def motion_equipment_options
      options_for(%w[STIRRER SHAKER HEATING_SHAKER TUBE BALL_MILLING])
    end

    def irradiation_equipment_options
      options_for(%w[ULTRA_SOUND_BATH UV_LAMP LED])
    end

    def remove_equipment_options
      options_for(%w[PUMP TUBE COIL])
    end

    def purify_equipment_options
      options_for(%w[FILTER SEPARATION_FILTER EXTRACTOR SPE_COLUMN FSPE_COLUMN
                     FLASH_COLUMN DISTILLATION_APPARATUS SEPARATION_FUNNEL BUCHNER_FUNNEL])
    end

    def temperature_additional_information_options
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

    def ph_additional_information_options
      [
        { value: 'PH_ELECTRODE', label: 'pH Electrode' },
        { value: 'PH_STRIPE', label: 'pH Stripe' },
        { value: 'PH_OTHER', label: 'Other' },
      ]
    end

    def irradiation_additional_information_options
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
# rubocop: enable Metrics/ClassLength
