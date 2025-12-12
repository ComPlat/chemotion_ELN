# frozen_string_literal: true

module Import
  module ReactionProcessEditor
    class ImportDeviceMethods
      DATA_DIR = ENV.fetch('REACTION_PROCESS_EDITOR_DATA_DIR', 'tmp/reaction_process_editor')
      DEVICES_FILES = 'devices/*.csv'
      DEVICENAME_PREFIX = ENV.fetch('REACTION_PROCESS_EDITOR_DEVICENAME_PREFIX', '')
      METHODNAME_SUFFIX = ENV.fetch('REACTION_PROCESS_EDITOR_DEVICE_METHODS_SUFFIX', '')

      DETECTOR_TYPES = { PDA: ['CHMO:0001728', 'WAVELENGTHLIST', 'WAVELENGTHS', 'NM', 'Wavelengths (nm)'],
                         'PDA/DAD': ['CHMO:0001728', 'WAVELENGTHLIST', 'WAVELENGTHS', 'NM', 'Wavelengths (nm)'],
                         ELSD: %w[CHMO:0002866 METRIC TEMPERATURE CELSIUS Temperature],
                         MS: %w[CHMO:0002337 TEXT MS_PARAMETER V Parameter] }.stringify_keys
      #  ,
      #  FID: %w[CHMO:0001719 METRIC WEIGTH g Weight],
      #  BID: %w[CHMO:0001724 METRIC WEIGTH g Weight] }.stringify_keys

      REGEX_NAMES_AND_BRACKET_VALUES = /(.*?) \((.*?)\),?/.freeze

      def execute
        set_all_inactive

        device_methods_files.each do |filename|
          CSV.parse(filename.read, col_sep: ';', headers: true, return_headers: false).each do |row|
            create_from_csv(method_csv: row, ontology: ontology_for_filename(filename))
          end
        end
      end

      private

      def create_from_csv(method_csv:, ontology:)
        # TODO: Sort of works as labels are unique / still contain device_name (by mistake)
        # Fix device_name calculation, determine associated ontology and use it to find_or_initialize

        method = ::ReactionProcessEditor::OntologyDeviceMethod
                 .find_or_initialize_by(
                   ontology: ontology,
                   label: method_label(method_name: method_csv['Method Name'], ontology: ontology),
                 )

        method.update!(method_options(method_csv: method_csv))
      rescue StandardError => e
        Rails.logger.error("Failed to import Method named: #{csv['Method Name']}")
        Rails.logger.error(e)
        Rails.logger.error(method)
        Rails.logger.error(method.errors&.full_messages)
      end

      def set_all_inactive
        # rubocop:disable Rails/SkipsModelValidations
        ::ReactionProcessEditor::OntologyDeviceMethod.update_all(active: false)
        # rubocop:enable Rails/SkipsModelValidations
      end

      def method_options(method_csv:)
        amount = method_csv['Default Inj. Vol.'].to_i
        unit = 'mcl'

        if (amount > 1000)
          amount = amount / 1000
          unit = 'ml'
        end

        {
          active: true,
          detectors: detectors(method_csv['Detectors']),
          mobile_phase: mobile_phase_options(method_csv['Solvent']),
          stationary_phase: [method_csv['Stationary Phase']],
          default_inject_volume: { value: amount, unit: unit},
          description: method_csv['Description'],
          steps: steps(method_csv),
        }
      end

      def method_label(method_name:, ontology:)
        method_name.delete_prefix(DEVICENAME_PREFIX)
                   .delete_prefix('_')
                   .delete_prefix(ontology.label)
                   .delete_prefix('_')
                   .delete_suffix(METHODNAME_SUFFIX)
                   .strip
      end

      def detectors(detectors_csv)
        detectors_data = detectors_csv.scan(REGEX_NAMES_AND_BRACKET_VALUES)
        detectors_data.map { |name_and_defaults| detector_option(name_and_defaults) }
      end

      def detector_option(name_and_defaults)
        detector_name = name_and_defaults[0].strip
        analysis_default_values = name_and_defaults[1]

        options = { label: detector_name, value: ontology_id(detector_name) }

        return options if analysis_default_values.blank?

        options.merge(analysis_defaults: detector_analysis_defaults(detector_name,
                                                                    analysis_default_values))
      end

      def analysis_default_values(data_type:, values:, unit:)
        case data_type
        when 'TEXT'
          "#{values} #{unit}"
        when 'METRIC'
          { value: values, unit: unit }
        when 'WAVELENGTHLIST'
          { peaks: values.split(',').map { |value| { value: value, unit: unit } } }
        end
      end

      def steps(method_csv)
        JSON.parse(method_csv['Steps'].to_s)
      rescue JSON::ParserError
        []
      end

      def ontology_id(detector_name)
        DETECTOR_TYPES[detector_name]&.first || detector_name
      end

      def detector_analysis_defaults(detector_name, values)
        ontology_id, data_type, metric, unit, label = DETECTOR_TYPES[detector_name]

        return [] unless ontology_id

        # TODO: A detector might have multiple metrics /metric_names (therefore we return an array).
        # Current files have only one. Adapt CSV parsing once/if file format ever changes. cbuggle, 14.10.2024.
        [{
          label: label,
          data_type: data_type,
          metric_name: metric,
          values: analysis_default_values(data_type: data_type, values: values, unit: unit),
        }]
      end

      def mobile_phase_options(mobile_phase)
        mobile_phase.split(';').map(&:strip)
      end

      def stationary_phase_analysis_defaults(value)
        { analysis_defaults: {
          TEMPERATURE: {
            value: value,
            unit: 'CELSIUS',
          },
        } }
      end

      def ontology_for_filename(filename)
        ontology_id = File.basename(filename, '.csv').tr('_', ':')

        ::ReactionProcessEditor::Ontology.find_by(ontology_id: ontology_id)
      end

      def device_methods_files
        Rails.root.glob("#{DATA_DIR}/#{DEVICES_FILES}")
      end
    end
  end
end
