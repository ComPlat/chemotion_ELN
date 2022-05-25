# frozen_string_literal: true

module Entities
  class ReportEntity < ApplicationEntity
    # This entity requires an additional parameter for the current user
    #

    expose(
      :configs,
      :downloadable,
      :file_description,
      :file_name,
      :id,
      :img_format,
      :mol_serials,
      :objects,
      :reaction_settings,
      :sample_settings,
      :si_reaction_settings,
      :template,
      :unread,
    )

    private

    def current_user_id
      raise 'ReportEntity requires current_user' unless options[:current_user]

      options[:current_user].id
    end

    def downloadable
      @downloadable ||= object.generated_at.present?
    end

    def downloaded
      @downloaded ||= object.reports_users
                            .find_by(user_id: current_user_id)
                            .downloaded_at.present?
    end

    def unread
      downloadable && !downloaded
    end

    def template
      object.report_templates_id || object.template
    end
  end
end
