class ReportSerializer < ActiveModel::Serializer
  attributes :id, :file_name, :file_description,
             :configs, :sample_settings, :reaction_settings, :mol_serials,
             :downloadable, :unread, :template, :img_format, :objects,
             :si_reaction_settings

  def downloadable
    @downloadable ||= object.generated_at.present?
  end

  def downloaded
    @downloaded ||= object.reports_users
                          .find{ |ru| ru.user_id == scope.current_user.id }
                          .downloaded_at.present?
  end

  def unread
    downloadable && !downloaded
  end

  def template
    object.report_templates_id ||= object.template
  end
end
