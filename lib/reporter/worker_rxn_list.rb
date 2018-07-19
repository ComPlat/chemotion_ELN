module Reporter
  class WorkerRxnList < Worker
    def initialize(args)
      super(args)
    end

    def process
      @content_objs, @procedure_objs = prism(@objs)

      Reporter::Xlsx::ReactionList.new(
        objs: @content_objs,
        mol_serials: @mol_serials
      ).create_xlsx(file_path)

      save_report
    end

    private

    def contents
      @objs
    end

    def fulll_file_name_ext
      @hash_name ||= Digest::SHA256.hexdigest(substance.to_s)
      @fulll_file_name_ext ||= "#{@file_name}_#{@hash_name}.#{@ext}"
    end
  end
end
