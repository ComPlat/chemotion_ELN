namespace :data do
  desc "create code_logs for existing elements analyses"
  task ver_20170414012345: :environment do
    ["sample","reaction","wellplate","screen"].each do |element_class|
      element_class.classify.constantize.find_each do |element|
        if !element.code_log
          CodeLog.create(source: element_class, source_id: element.id)
        end
      end
    end
    Container.where(container_type: "analysis").find_each do |container|
      if !container.code_log
        CodeLog.create(source: "container", source_id: container.id)
      end
    end
    CodeLog.find_each do |code|
      code.send :create_qr_svgs
    end
  end
end
