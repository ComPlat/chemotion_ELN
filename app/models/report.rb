class Report < ActiveRecord::Base
  acts_as_paranoid

  serialize :configs, Hash
  serialize :sample_settings, Hash
  serialize :reaction_settings, Hash
  serialize :si_reaction_settings, Hash
  serialize :objects, Array
  serialize :mol_serials, Array
  serialize :prd_atts, Array

  has_many :reports_users
  has_many :users, through: :reports_users
  has_many :attachments, as: :attachable

  default_scope { includes(:reports_users) }

  after_destroy :delete_archive

  def create_docx
    template = self.template
    tpl_path = self.class.template_path(template)
    case template
    when 'spectrum'
      Reporter::WorkerSpectrum.new(
        report: self, template_path: tpl_path
      ).process
    when 'supporting_information'
      Reporter::WorkerSi.new(
        report: self, template_path: tpl_path
      ).process
    when 'rxn_list_xlsx'
      Reporter::WorkerRxnList.new(
        report: self, ext: 'xlsx'
      ).process
    when 'rxn_list_csv'
      Reporter::WorkerRxnList.new(
        report: self, ext: 'csv'
      ).process
    when 'rxn_list_html'
      Reporter::WorkerRxnList.new(
        report: self, template_path: tpl_path, ext: 'html'
      ).process
    else
      Reporter::Worker.new(
        report: self, template_path: tpl_path
      ).process
    end
  end
  handle_asynchronously :create_docx

  def self.create_reaction_docx(current_user, user_ids, params)
    file_name = docx_file_name(params[:template])
    docx = docx_file(current_user, user_ids, params)
    [docx, file_name]
  end

  def self.docx_file(current_user, user_ids, params)
    r = Reaction.find(params[:id])
    r_hash = ElementReportPermissionProxy.new(current_user, r, user_ids).serialized
    content = Reporter::Docx::Document.new(objs: [r_hash]).convert
    tpl_path = template_path(params[:template])
    file = Sablon.template(tpl_path)
                  .render_to_string(merge(current_user,
                                          content,
                                          all_spl_settings,
                                          all_rxn_settings,
                                          all_configs))
  end

  def self.docx_file_name(template)
    now = Time.now.strftime("%Y-%m-%dT%H-%M-%S")
    case template
      when "supporting_information"
        "Supporting_Information_#{now}.docx"
      when "single_reaction"
        "ELN_Reaction_#{now}.docx"
      else
        "ELN_Report_#{now}.docx"
    end
  end

  def self.template_path(template)
    case template
    when 'supporting_information'
      Rails.root.join('lib', 'template', 'Supporting_information.docx')
    when 'spectrum'
      Rails.root.join('lib', 'template', 'Spectra.docx')
    when 'single_reaction'
      Rails.root.join('lib', 'template', 'ELN_Objs.docx')
    when 'rxn_list_html'
      Rails.root.join('lib', 'template', 'rxn_list.html.erb')
    else
      Rails.root.join('lib', 'template', 'ELN_Objs.docx')
    end
  end

  def self.merge(current_user, contents, spl_settings, rxn_settings, configs)
    {
      date: Time.now.strftime("%d.%m.%Y"),
      author: "#{current_user.first_name} #{current_user.last_name}",
      spl_settings: spl_settings,
      rxn_settings: rxn_settings,
      configs: configs,
      objs: contents
    }
  end

  def self.all_spl_settings
    {
      diagram: true,
      collection: true,
      analyses: true,
      reaction_description: true,
    }
  end

  def self.all_rxn_settings
    {
      diagram: true,
      material: true,
      description: true,
      purification: true,
      tlc: true,
      observation: true,
      analysis: true,
      literature: true,
    }
  end

  def self.all_configs
    {
      page_break: true,
      whole_diagram: true,
    }
  end

  def delete_archive
    full_file_path = File.join('public', 'docx', file_name + '.docx')
    FileUtils.rm(full_file_path, force: true) if File.exist?(full_file_path)
  end
end
