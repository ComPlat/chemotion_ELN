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
        data = Entities::ReportTemplateEntity.represent(ReportTemplate.all.order(:id), only: [:id, :name, :report_type, :attachment_id ])
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
        if file && tempfile = file[:tempfile]
          attachment_id = report_template.attachment_id
          report_template.attachment = Attachment.new(
            bucket: file[:container_id],
            filename: file[:filename],
            key: file[:name],
            file_path: file[:tempfile],
            created_by: current_user.id,
            created_for: current_user.id,
            content_type: file[:type]
          )

          begin
            report_template.save!
            Attachment.find(attachment_id).delete
          ensure
            tempfile.close
            tempfile.unlink
          end
        end

        report_template.save!
      end

      desc 'Upload new template'
      params do
        requires :report_type, type: String, desc: 'Template Type'
        optional :file, type: File, desc: 'Template File'
      end
      post do
        report_template = ReportTemplate.new(
          name: params[:name],
          report_type: params[:report_type]
        )

        file = params[:file]
        if file
          if tempfile = file[:tempfile]
            attachment = Attachment.new(
              bucket: file[:container_id],
              filename: file[:filename],
              key: file[:name],
              file_path: file[:tempfile],
              created_by: current_user.id,
              created_for: current_user.id,
              content_type: file[:type]
            )

            report_template.attachment = attachment
            begin
              report_template.save!
              primary_store = Rails.configuration.storage.primary_store
              attachment.update!(storage: primary_store)
            ensure
              tempfile.close
              tempfile.unlink
            end
          end
        else
          report_template.save!
        end
      end

      desc 'Delete Template'
      delete ':id' do
        ReportTemplate.find(params[:id]).destroy

        true
      end
    end
  end
end
