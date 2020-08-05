module Reporter
  class WorkerSi < Worker
    attr_reader :objs, :content_objs, :procedure_objs,
                :contents, :procedures
    def initialize(args)
      super(args)
    end

    private

    def contents
      @contents ||= Docx::Document.new(
                            objs: @content_objs,
                            spl_settings: @spl_settings,
                            rxn_settings: @rxn_settings,
                            si_rxn_settings: @si_rxn_settings,
                            configs: @configs,
                            img_format: img_format,
                            font_family: "Times New Roman",
                            template: "supporting_information",
                            mol_serials: @mol_serials,
                            std_rxn: @std_rxn,
                          ).convert
    end

    def procedures
      @procedures ||= Docx::Document.new(
                              objs: @procedure_objs,
                              spl_settings: @spl_settings,
                              rxn_settings: @rxn_settings,
                              si_rxn_settings: @si_rxn_settings,
                              configs: procedure_config,
                              img_format: img_format,
                              font_family: "Times New Roman",
                              template: "supporting_information",
                              mol_serials: @mol_serials,
                              std_rxn: @std_rxn,
                            ).convert
    end

    def substance
      @content_objs, @procedure_objs = prism(@objs)
      @substance ||= {
        contents: contents,
        procedures: procedures,
        spl_settings: @spl_settings,
        rxn_settings: @rxn_settings,
        si_rxn_settings: @si_rxn_settings,
        configs: @configs,
      }
    end

    def procedure_config
      @configs.merge({whole_diagram: true, product_diagram: false})
    end

    def img_format
      "png"
    end
  end
end
