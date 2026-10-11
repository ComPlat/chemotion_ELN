# frozen_string_literal: true

module Entities
  class ReportEntity < ApplicationEntity
    # This entity requires an additional parameter for the current user

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
      :report_type,
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
                            .find { |ru| ru.user_id == current_user_id }
                            &.downloaded_at.present?
    end

    def unread
      downloadable && !downloaded
    end

    def template
      object.report_templates_id || object.template
    end

    # The report type the file was generated with (e.g. +rxn_list_xlsx+), unlike +template+,
    # which is the stored template's id when one was selected.
    def report_type
      object.template
    end
  end
end
