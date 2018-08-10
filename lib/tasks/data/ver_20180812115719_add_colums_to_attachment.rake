namespace :data do
  desc 'Move Reports to LSDF'
  task ver_20180812115719_add_colums_to_attachment: :environment do
    DOCX_TYP = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    XLSX_TYP = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    CSV_TYP = 'text/csv'
    HTML_TYP = 'text/html'
    PRIMARY_STORE = Rails.configuration.storage.primary_store

    def get_configs(template)
      tmp_path = nil
      typ = nil
      case template
      when 'rxn_list_html'
        tmp_path = Rails.root.join('public', 'html').to_s
        typ = HTML_TYP
        ext = '.html'
      when 'rxn_list_csv'
        tmp_path = Rails.root.join('public', 'csv').to_s
        typ = CSV_TYP
        ext = '.csv'
      when 'rxn_list_xlsx'
        tmp_path = Rails.root.join('public', 'xlsx').to_s
        typ = XLSX_TYP
        ext = '.xlsx'
      when 'spectrum'
        tmp_path = Rails.root.join('public', 'docx').to_s
        typ = DOCX_TYP
        ext = '.docx'
      when 'supporting_information'
        tmp_path = Rails.root.join('public', 'docx').to_s
        typ = DOCX_TYP
        ext = '.docx'
      when 'standard'
        tmp_path = Rails.root.join('public', 'docx').to_s
        typ = DOCX_TYP
        ext = '.docx'
      else
        tmp_path = Rails.root.join('public', 'docx').to_s
        typ = DOCX_TYP
        ext = '.docx'
      end

      [tmp_path, typ, ext]
    end

    Attachment.find_each do |att|
      att.update_columns(
        attachable_type: 'Container'
      )
    end

    Report.find_each do |rp|
      next if rp.file_path.nil?
      tmp_path, typ, ext = get_configs(rp.template)
      tmp_path = tmp_path + '/' + rp.file_path

      att = rp.attachments.create!(
        filename: rp.file_name + '.' + ext,
        key: File.basename(tmp_path),
        file_path: tmp_path,
        created_by: rp.author_id,
        created_for: rp.author_id,
        content_type: typ
      )
      att.update!(storage: PRIMARY_STORE)
    end
  end
end
