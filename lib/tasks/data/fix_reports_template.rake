namespace :data do
  desc 'update report template rxn_list to rxn_list_xlsx'
  task fix_reports_template: :environment do
    Report.with_deleted.find_each do |r|
      if r.template == 'rxn_list'
        r.update_columns(template: 'rxn_list_xlsx')
      end
    end
  end
end
