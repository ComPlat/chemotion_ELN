# frozen_string_literal: true

module Chemotion
  class ReportTemplateAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do |_error|
      message = 'Could not find report template'
      error!(message, 404)
    end

    resource :report_templates do
      desc 'Return list templates'
      get do
        data = Entities::ReportTemplateEntity.represent(ReportTemplate.all.order(:id),
                                                        only: %i[id name report_type attachment_id])
        { templates: data }
      end

      before do
        error!('401 Unauthorized', 401) unless current_user.is_a?(Admin)
      end
      desc 'Return template by id'
      get ':id' do
        report_template = ReportTemplate.includes(:attachment).find(params[:id])

        present report_template, with: Entities::ReportTemplateEntity, root: :template
      end

      desc 'Update new template'
      params do
        requires :id, type: Integer
        requires :name, type: String, desc: 'Template Name'
        requires :report_type, type: String, desc: 'Template Type'
        optional :file, type: File, desc: 'Template File'
        optional :attachment_id
      end
      put ':id' do
        report_template = ReportTemplate.includes(:attachment).find(params[:id])
        report_template.name = params[:name]
        report_template.report_type = params[:report_type]
        file = params[:file]

        if file && file[:tempfile]

          attachment = Attachment.new(
            bucket: file[:container_id],
            filename: file[:filename],
            key: file[:name],
            created_by: current_user.id,
            created_for: current_user.id,
            content_type: file[:type],
            file_path: file[:tempfile].path,
          )

          begin
            attachment.save!
            report_template.attachment = attachment
            report_template.save!
          ensure
            file[:tempfile].close
            file[:tempfile].unlink
          end
        end

        report_template.save!
      end

      desc 'Create new template'
      params do
        requires :report_type, type: String, desc: 'Template Type'
        optional :file, type: File, desc: 'Template File'
      end
      post do
        Usecases::ReportTemplates::Create.new(params, current_user.id).execute!
      end

      desc 'Delete Template'
      delete ':id' do
        ReportTemplate.find(params[:id]).destroy

        true
      end
    end
  end
end
