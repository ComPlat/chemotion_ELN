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
                         MS: %w[CHMO:0002337 TEXT MS_PARAMETER V Parameter],
                         #  MS: %w[CHMO:0002174 TEXT MS_PARAMETER V Parameter],
                         FID: %w[CHMO:0001719 METRIC WEIGTH g Weight],
                         BID: %w[CHMO:0001724 METRIC WEIGTH g Weight] }.stringify_keys

      REGEX_NAMES_AND_BRACKET_VALUES = /(.*?) \((.*?)\),?/.freeze

      def execute
        set_all_inactive

        device_methods_files.each do |filename|
          CSV.parse(filename.read, col_sep: ';', headers: true, return_headers: false).each do |row|
            create_from_csv(csv: row, device_name: parse_device_name(filename))
          end
        end
      end

      private

      def create_from_csv(csv:, device_name:)
        device_code = ::ReactionProcessEditor::Ontology.normalize_device_code(device_name: device_name)
        method = ::ReactionProcessEditor::OntologyDeviceMethod
                 .find_or_initialize_by(device_code: device_code,
                                        label: method_label(method_csv: csv,
                                                            device_name: device_name))

        method.update!(method_options(method_csv: csv, device_name: device_name))
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

      def method_options(method_csv:, device_name:)
        device_code = ::ReactionProcessEditor::Ontology.normalize_device_code(device_name: device_name)
        device = ::ReactionProcessEditor::Ontology.find_by(device_code: device_code)

        {
          active: true,
          ontology: device,
          device_code: device_code,
          label: method_label(method_csv: method_csv, device_name: device_name),
          detectors: detectors(method_csv['Detectors']),
          mobile_phase: mobile_phase_options(method_csv['Mobile Phase']),
          stationary_phase: stationary_phase_options(method_csv['Stationary Phase']),
          default_inject_volume: { value: method_csv['Def. Inj. Vol.'], unit: 'ml' },
          description: method_csv['Description'],
          steps: steps(method_csv),
        }
      end

      def method_label(method_csv:, device_name:)
        method_csv['Method Name']
          .delete_prefix(DEVICENAME_PREFIX)
          .delete_prefix(device_name)
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

        options = { label: detector_name, value: chmo_id(detector_name), source: 'ImportDeviceMethods.rb' }

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

      def chmo_id(detector_name)
        DETECTOR_TYPES[detector_name]&.first || detector_name
      end

      def detector_analysis_defaults(detector_name, values)
        chmo_id, data_type, metric, unit, label = DETECTOR_TYPES[detector_name]

        return [] unless chmo_id

        # TODO: A detector might have multiple metrics /metric_names (therefore we return an array).
        # Current files have only one. Adapt CSV parsing once/if File format changes. cbuggle, 14.10.2024.
        [{
          label: label,
          data_type: data_type,
          metric_name: metric,
          values: analysis_default_values(data_type: data_type, values: values, unit: unit),
        }]
      end

      def mobile_phase_options(mobile_phase)
        mobile_phase.scan(REGEX_NAMES_AND_BRACKET_VALUES).pluck(0).flatten
      end

      def stationary_phase_options(phase)
        phase_data = phase.match(REGEX_NAMES_AND_BRACKET_VALUES)

        label = phase_data[1].strip
        analysis_default_value = phase_data[2]

        option = { label: label, value: label }

        if analysis_default_value.present?
          option = option.merge(stationary_phase_analysis_defaults(analysis_default_value))
        end
        [option]
      end

      def stationary_phase_analysis_defaults(value)
        { analysis_defaults: {
          TEMPERATURE: {
            value: value,
            unit: 'CELSIUS',
          },
        } }
      end

      def parse_device_name(filename)
        File.basename(filename, '.csv').delete_prefix(DEVICENAME_PREFIX)
      end

      def device_methods_files
        Rails.root.glob("#{DATA_DIR}/#{DEVICES_FILES}")
      end
    end
  end
end
