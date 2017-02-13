module Reporter
  class Worker
    def initialize(args)
      @report = args[:report]
      @objs = extract(@report.objects)
      @file_name = @report.file_name
      @spl_settings = @report.sample_settings
      @rxn_settings = @report.reaction_settings
      @configs = @report.configs
      @img_format = @report.img_format
      @user_name = User.find(@report.author_id).name
    end

    def process
      raw = Sablon.template(template_path).render_to_string(substance)
      create_docx(raw)
      save_report
    end

    private

    def save_report
      @report.update_attributes(file_path: fulll_file_name_ext, generated_at: Time.zone.now)
    end

    def create_docx(raw)
      File.open(file_path.to_s, "wb+") do |f|
        f.write(raw)
      end
    end

    def fulll_file_name_ext
      @hash_name ||= Digest::SHA256.hexdigest(substance.to_s)
      @fulll_file_name_ext ||= "#{@file_name}_#{@hash_name}.docx"
    end

    def file_path
      @file_path ||= Rails.root.join("public", "docx", fulll_file_name_ext)
    end

    def extract(objects)
      objects.map do |tag|
        tag["type"].camelize.constantize.find(tag["id"])
      end
    end

    def template_path
      Rails.root.join("lib", "template", "ELN_Objs.docx")
    end

    def contents
      @contents ||= Docx::Document.new(
                      objs: @objs,
                      spl_settings: @spl_settings,
                      rxn_settings: @rxn_settings,
                      configs: @configs,
                      img_format: @img_format
                    ).convert
    end

    def substance
      @substance ||= {
        date: Time.now.strftime("%d.%m.%Y"),
        author: "#{@user_name}",
        spl_settings: @spl_settings,
        rxn_settings: @rxn_settings,
        configs: @configs,
        objs: contents
      }
    end
  end
end
