DIR = Rails.root.join('lib', 'template').to_s
USER_ID = User.first.id
TEMPLATE_LIST = [
  [ "Standard.docx", "Standard", "standard" ],
  [ "Supporting_information.docx", "Supporting Information", "supporting_information" ],
  [ "Supporting_information.docx", "Supporting Information - Standard Reaction", "supporting_information_std_rxn" ],
  [ "Spectra.docx", "Supporting Information - Spectra", "spectrum" ],
  [ nil, "Supporting Information - Reaction List (.xlsx)", "rxn_list_xlsx" ],
  [ nil, "Supporting Information - Reaction List (.csv)", "rxn_list_csv" ],
  [ "rxn_list.html.erb", "Supporting Information - Reaction List (.html)", "rxn_list_html" ]
]

def create_template(file_name, template_name, template_type)
  if(file_name)
    attachment = Attachment.create!(
      filename: file_name,
      key: 'file',
      file_path: "#{DIR}/#{file_name}",
      created_by: USER_ID,
      created_for: USER_ID,
      content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

    ReportTemplate.create!(
      name: "#{template_name}", report_type: "#{template_type}", attachment: attachment
    )
  
    primary_store = Rails.configuration.storage.primary_store
    attachment.update!(storage: primary_store)
  else
    ReportTemplate.create!(
      name: "#{template_name}", report_type: "#{template_type}"
    )
  end
end

TEMPLATE_LIST.each do |templ|
  ReportTemplate.find_by(name: templ[1]) || create_template(*templ)
end
