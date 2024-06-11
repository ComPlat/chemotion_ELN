# frozen_string_literal: true

# rubocop:disable Metrics/MethodLength

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Chromatography < Base
        def self.select_options
          {
            automation_modes: SelectOptions::Chromatography.automation_modes,
            step_modes: SelectOptions::Chromatography.step_modes,
            prod_modes: SelectOptions::Chromatography.prod_modes,
            jar_materials: SelectOptions::Chromatography.jar_materials,
            devices: SelectOptions::Chromatography.devices,
            column_types: SelectOptions::Chromatography.column_types,
            detectors: SelectOptions::Chromatography.detectors,
          }
        end

        def self.automation_modes
          [{ value: 'MANUAL', label: 'Manual' },
           { value: 'SEMI_AUTOMATED', label: 'Semi-Automated' },
           { value: 'AUTOMATED', label: 'Automated' }]
        end

        def self.step_modes
          [{ value: 'EQUILIBRIUM', label: 'Equilibrium' },
           { value: 'SEPARATION', label: 'Separation' },
           { value: 'AFTER_RUN', label: 'After Run' }]
        end

        def self.prod_modes
          [{ value: 'ANY', label: 'Any' },
           { value: 'PROD', label: 'Prod' },
           { value: 'NONE', label: 'No' }]
        end

        def self.jar_materials
          [{ value: 'GLASS', label: 'Glass' },
           { value: 'METAL', label: 'Metal' }]
        end

        def self.devices
          [{ value: 'HPLC', label: 'HPLC (LC, SFC, GPC & SEC)' },
           { value: 'MPLC', label: 'MPLC' },
           { value: 'GC', label: 'Gas Chromatography' },
           { value: 'FLASH', label: 'Flash' },
           { value: 'IEC', label: 'Ion Exchange Chromatography' }]
        end

        def self.column_types
          { HPLC: [
              { value: 'Phenomenex, Kinetex, 2.6 µm XB-C18 100 Å, 100 x 4.6 mm', label: 'Phenomenex, Kinetex, XB-C18' },
              { value: 'Daicel Group, Chiralpak AD, 10 µm Amylose Tris(3,5-dimethylphenylcarbamate), 250 x 4.6 mm',
                label: 'Daicel Group, Chiralpak AD, Amylose Tris' },
              { value: 'YMC, Chiral ART, S-5 µm Amylose SA, 250 x 4.6 mm', label: 'YMC, Chiral ART, Amylose SA' },
              { value: 'VDS Optilab, VDSpher, 5 µm C18-E 100, 250 x 4.0 mm', label: 'VDS Optilab, VDSpher, C18-E' },
              { value: 'Interchim, PuriFLASH Prep, 10 µm C18-AQ, 250 x 21.2 mm', label: 'IC, PuriFLASH Prep, C18-AQ' },
              { value: 'PSS, GRAM Lux, 10 µm GRAM 3000 Å, 300 mm x 8 mm', label: 'PSS, GRAM Lux, GRAM 3000 Å' },
              { value: 'PSS, SDV, 5 µm SDV 100 000 Å, 300 x 8 mm', label: 'PSS, SDV, SDV 100 000 Å' },
              { value: 'VDS Optilab, VDSpher, 5 µm C18-E 100, 250 x 20 mm', label: 'VDS Optilab, VDSpher, C18-E 100' },
            ],
            MPLC: [
              { value: 'Interchim, PuriFLASH, Silica 15 µm, 4 g', label: 'Silica 15 µm, 4 g' },
              { value: 'Interchim, PuriFLASH, Silica 15 µm, 12 g', label: 'Silica 15 µm, 12 g' },
              { value: 'Interchim, PuriFLASH, Silica 15 µm, 25 g', label: 'Silica 15 µm, 25 g' },
              { value: 'Interchim, PuriFLASH, Silica 15 µm, 40 g', label: 'Silica 15 µm, 40 g' },
              { value: 'Interchim, PuriFLASH, Silica 15 µm, 80 g', label: 'Silica 15 µm, 80 g' },
              { value: 'Interchim, PuriFLASH, Silica 50 µm, 4 g', label: 'Silica 50 µm, 4 g' },
              { value: 'Interchim, PuriFLASH, Silica 50 µm, 12 g',  label: 'Silica 50 µm, 12 g' },
              { value: 'Interchim, PuriFLASH, Silica 50 µm, 25 g',  label: 'Silica 50 µm, 25 g' },
              { value: 'Interchim, PuriFLASH, Silica 50 µm, 40 g',  label: 'Silica 50 µm, 40 g' },
              { value: 'Interchim, PuriFLASH, Silica 50 µm, 80 g',  label: 'Silica 50 µm, 80 g' },
              { value: 'Interchim, PuriFLASH, Silica 50 µm, 120 g', label: 'Silica 50 µm, 120 g' },
            ],
            GC: [
              { value: 'Shimadzu, SH-I-624Sil MS, 30 m 0.25 mm 1.4 µm', label: 'SH-I-624Sil MS' },
              { value: 'Shimadzu, SH-I-5Sil MS, 30 m 0.25 mm 0.25 µm', label: 'SH-I-5Sil MS' },
              { value: 'Agilent Technologies, CB-Chirasil Dex CB, 25 m 0.25 mm 0.25 µm', label: 'CB-Chirasil Dex CB' },
              { value: 'Macherey-Nagel, FS-Hydrodex-G-TBDAc, 25 m 0.25 mm', label: 'FS-Hydrodex-G-TBDAc' },
              { value: 'Shimadzu, SH-U-BOND, 30 m 0.32 mm 10 µm', label: 'SH-U-BOND' },
              { value: 'Shimadzu, SH-Msieve 5 Å, 30 m 0.32 mm', label: 'SH-Msieve 5 Å' },
            ],
            FLASH: [
              { value: 'VWR BDH Chemicals, Silica Gel, 40 - 63 µm', label: 'VWR, Silica, 40 - 63 µm' },
              { value: 'VWR BDH Chemicals, Florisil, 30 - 60 µm', label: 'VWR, Florisil, 30 - 60 µm' },
              { value: 'Carl Roth, Florisil, 100 - 200 µm', label: 'C Roth, Florisil, 100 - 200 µm' },
            ],
            IEC: [] }
        end

        def self.detectors
          [
            { value: 'NO_DETECTOR', label: 'No detector' },
            { value: 'PHOTODIODE_ARRAY', label: 'PDA / DAD' },
            { value: 'VARIABLE_WAVELENGTH', label: 'VWD' },
            { value: 'REFRACTIVE_INDEX', label: 'RID' },
            { value: 'FLUORESCENCE', label: 'FLD' },
            { value: 'EVAPORATIVE_LIGHT_SCATTERING', label: 'ELSD )' },
            { value: 'FLAME_IONIZATION', label: 'FID' },
            { value: 'BARRIER_IONIZATION_DISCHARGE', label: 'BID' },
            { value: 'THERMAL_CONDUCTIVIT', label: 'TCD' },
          ]
        end
      end
    end
  end
end
# rubocop:enable Metrics/MethodLength
