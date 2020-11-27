module Reporter
  class Worker
    DOCX_TYP = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    XLSX_TYP = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    CSV_TYP = 'text/csv'
    HTML_TYP = 'text/html'

    def initialize(args)
      @report = args[:report]
      @author = User.find(@report.author_id)
      @ext = args[:ext] || 'docx'
      @objs = extract(@report.objects)
      @file_name = @report.file_name
      @spl_settings = @report.sample_settings
      @rxn_settings = @report.reaction_settings
      @si_rxn_settings = @report.si_reaction_settings
      @configs = @report.configs
      @img_format = @report.img_format
      @template_path = args[:template_path]
      @mol_serials = @report.mol_serials
      @std_rxn = args[:std_rxn] || false
      init_specific_variable
    end

    def process
      raw = Sablon.template(@template_path).render_to_string(substance)
      tmpfile = create_tmp(raw)
      create_attachment(tmpfile) if tmpfile
    end

    private

    def init_specific_variable
      @full_filename = "#{@file_name}.docx"
      @typ = DOCX_TYP
      @primary_store = Rails.configuration.storage.primary_store
    end

    def create_tmp(raw)
      tmp_file = Tempfile.new
      tmp_file.write(raw)
      tmp_file.close
      tmp_file
    end

    def create_attachment(tmp)
      ActiveRecord::Base.transaction do
        att = @report.attachments.create!(
          filename: @full_filename,
          key: File.basename(tmp.path),
          file_path: tmp.path,
          created_by: @author.id,
          created_for: @author.id,
          content_type: @typ
        )

        TransferFileFromTmpJob.set(queue: "transfer_report_from_tmp_#{att.id}").perform_later([att.id]) unless att.nil?

        @report.update_attributes(
          generated_at: Time.zone.now
        )
      end


      message = Message.create_msg_notification(
        channel_subject: Channel::REPORT_GENERATOR_NOTIFICATION,
        data_args: { report_name: @full_filename}, message_from: @author.id,
        report_id: @report.id
      )

    ensure
      tmp.unlink
    end

    def user_ids
      @author.group_ids + [@author.id]
    end

    def extract(objects)
      objects.map do |tag|
        e = tag['type'].camelize.constantize.find(tag['id'])
        ElementReportPermissionProxy.new(@author, e, user_ids).serialized
      end
    end

    def contents
      @contents ||= Docx::Document.new(
                      objs: @objs,
                      spl_settings: @spl_settings,
                      rxn_settings: @rxn_settings,
                      si_rxn_settings: @si_rxn_settings,
                      configs: @configs,
                      img_format: @img_format,
                      std_rxn: @std_rxn,
                    ).convert
    end

    def substance
      @substance ||= {
        date: Time.now.strftime("%d.%m.%Y"),
        author: "#{@author.name}",
        spl_settings: @spl_settings,
        rxn_settings: @rxn_settings,
        si_rxn_settings: @si_rxn_settings,
        configs: @configs,
        objs: contents
      }
    end

    def prism(objs)
      cont_objs, proc_objs = [], []
      objs.each do |obj|
        next if obj[:type] == "sample"
        is_general_procedure(obj) ? proc_objs.push(obj) : cont_objs.push(obj)
      end
      return cont_objs, proc_objs
    end

    def is_general_procedure(obj)
      obj[:type] == "reaction" && obj[:role] == "gp"
    end
  end
end
