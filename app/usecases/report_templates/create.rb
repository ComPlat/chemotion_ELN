# frozen_string_literal: true

module Usecases
  module ReportTemplates
    class Create
      attr_reader :research_plan, :wellplate

      def initialize(params, userid)
        @params = params
        @userid = userid
      end

      def execute!
        @report_template = build_template

        add_file_to_template if file_in_params?

        @report_template.save!
      end

      private

      def build_attachment
        Attachment.new(
          bucket: @params[:file][:container_id],
          filename: @params[:file][:filename],
          key: @params[:file][:name],
          created_by: @userid,
          created_for: @userid,
          content_type: @params[:file][:type],
          file_path: @params[:file][:tempfile].path,
        )
      end

      def add_file_to_template
        attachment = build_attachment
        begin
          attachment.save!
          @report_template.attachment = attachment
        ensure
          @params[:file][:tempfile].close
          @params[:file][:tempfile].unlink
        end
      end

      def build_template
        ReportTemplate.new(
          name: @params[:name],
          report_type: @params[:report_type],
        )
      end

      def file_in_params?
        @params[:file] && @params[:file][:tempfile]
      end
    end
  end
end
