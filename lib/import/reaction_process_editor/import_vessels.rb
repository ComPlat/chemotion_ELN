# frozen_string_literal: true

module Import
  module ReactionProcessEditor
    class ImportVessels
      ROOT_DIR = ENV.fetch('REACTION_PROCESS_EDITOR_DATA_DIR', 'tmp/reaction_process_editor')
      FILES = 'vessels/*.csv'

      # CSV file constants as discussed and defined with PHodapp, NJung, cbuggle.
      VESSEL_TEMPLATE_KEY = 'Vessel/Template'
      SHORT_LABEL_KEY = 'ID (short-label)'
      NAME_KEY = 'Short-Description (Name)'
      VESSEL_TYPE_KEY = 'Type'
      DESCRIPTION_KEY = 'Description (Details)'
      MATERIAL_KEY = 'Material'
      VOLUME_KEY = 'Vol.'
      MODE_KEY = 'Mode'
      MODE_SEPARATOR = ';'

      def execute
        ActiveRecord::Base.transaction do
          ontology_files.each do |filename|
            CSV.foreach(filename, col_sep: ';', headers: true, return_headers: false,
                                  converters: [->(string) { string&.strip }]) do |row|
              User.where(type: 'Person').find_each do |person|
                create_from_csv(row, person)
              end
            end
          end
        end
      end

      private

      def create_from_csv(csv, current_user) # rubocop:disable Metrics/CyclomaticComplexity, Metrics/AbcSize
        name = csv[NAME_KEY]
        return if name.blank?

        vessel_template = VesselTemplate.find_or_initialize_by(name: name)

        amount, unit = csv[VOLUME_KEY].scan(/(.*) (.*)/)[0]

        vessel_template.update!(
          vessel_type: csv[VESSEL_TYPE_KEY],
          material_type: csv[MATERIAL_KEY],
          volume_amount: amount,
          volume_unit: unit,
          automation_modes: csv[MODE_KEY].split(MODE_SEPARATOR),
          details: csv[DESCRIPTION_KEY],
        )

        if csv[VESSEL_TEMPLATE_KEY] == 'Vessel'
          short_label = csv[SHORT_LABEL_KEY]
          vessel = Vessel.find_or_initialize_by(vessel_template: vessel_template, short_label: short_label,
                                                creator: current_user)

          vessel.name = name
          vessel.creator = current_user
          vessel.save!
        end
      rescue StandardError => e
        Rails.logger.error("Failed to import Vessel with short_label: #{short_label}: \n #{e.inspect}")
        Rails.logger.error(vessel&.errors&.full_messages)
        Rails.logger.error(vessel_template&.errors&.full_messages)
      end

      def ontology_files
        Rails.root.glob("#{ROOT_DIR}/#{FILES}")
      end

      def vessel_type(text)
        text == 'Vessel' ? 'Vessel' : 'VesselTemplate'
      end
    end
  end
end
