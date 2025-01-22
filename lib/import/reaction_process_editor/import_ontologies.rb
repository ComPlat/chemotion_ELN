# frozen_string_literal: true

module Import
  module ReactionProcessEditor
    class ImportOntologies
      ROOT_DIR = ENV.fetch('REACTION_PROCESS_EDITOR_DATA_DIR', 'tmp/reaction_process_editor')
      FILES = 'ontologies/*.csv'

      # File format constants as discussed and defined with PHodapp, NJung, cbuggle, 18.11.2024
      DEPENDENCY_SEPARATOR = '|'
      PARENT_SEPARATOR = ';'
      PARENT_DEPENDENCIES_SEPARATOR = ','
      ROLE_DELETE_CHARS = '=;'
      VALUES_WITH_BRACKET = /(.*?)\((.*?)\)\|?;?/.freeze

      def execute
        ActiveRecord::Base.transaction do
          set_all_inactive

          ontology_files.each do |filename|
            CSV.foreach(filename, col_sep: ';', headers: true, return_headers: false,
                                  converters: [->(string) { string&.strip }]) do |row|
              create_from_csv(row)
            end
          end

          Import::ReactionProcessEditor::ImportDeviceMethods.new.execute
        end
      end

      private

      def set_all_inactive
        # rubocop:disable Rails/SkipsModelValidations
        ::ReactionProcessEditor::Ontology.update_all(active: false)
        # rubocop:enable Rails/SkipsModelValidations
      end

      def create_from_csv(csv)
        ontology_id = csv['Ontology ID'] || csv['Onthology ID'] || csv['CHMO']
        return if ontology_id.blank?

        ontology = ::ReactionProcessEditor::Ontology.find_or_initialize_by(ontology_id: ontology_id)

        ontology.update!(
          name: csv['Ontology Name'],
          label: csv['Custom Label'], # || csv['Custom Name'] || csv['Own Name'], # inconsistent in actual files.
          link: csv['Link'],
          detectors: detectors(csv['Detectors']),
          solvents: csv['Solvents'],
          roles: roles(csv['Roles']),
          stationary_phase: stationary_phase(csv['Stationary Phase']),
          active: true,
        )
      rescue StandardError => e
        Rails.logger.error("Failed to import Ontology with ONTOLOGY_ID: #{ontology.ontology_id}: \n #{e.inspect}")
        Rails.logger.error(ontology.errors.full_messages)
      end

      def stationary_phase(phase)
        return [] unless phase

        phase.split('; ')
      end

      def roles(parents)
        parents = parents&.split(PARENT_SEPARATOR) || ['unused']

        dependencies = {}
        parents.each do |parent|
          role, role_dependencies = parent.split(PARENT_DEPENDENCIES_SEPARATOR)
          role = role.delete(ROLE_DELETE_CHARS).strip.tr(' ', '_')

          dependencies[role] ||= []
          dependencies[role] << role_dependencies(role_dependencies)
        end
        dependencies['automation_mode'] ||= dependencies['mode'].presence if dependencies['mode'].presence
        dependencies.delete('mode')
        dependencies
      end

      def role_dependencies(dependencies)
        options = {}
        dependencies&.scan(VALUES_WITH_BRACKET)&.each do |ontology_id, dependency_type|
          options[dependency_type.strip.tr(' ', '_')] ||= []
          options[dependency_type.strip.tr(' ', '_')] << ontology_id.strip
        end
        options['automation_mode'] ||= options['mode'].presence if options['mode'].presence
        options.delete('mode')
        options
      end

      def detectors(detectors_csv)
        return [] if detectors_csv.blank?

        detectors_csv.split(/[,;]/).filter_map(&:strip)
      end

      def ontology_files
        Rails.root.glob("#{ROOT_DIR}/#{FILES}")
      end
    end
  end
end
