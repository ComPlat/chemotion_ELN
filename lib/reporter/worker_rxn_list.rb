module Reporter
  class WorkerRxnList < Worker
    attr_reader :objs
    def initialize(args)
      super(args)
    end

    def process
      Reporter::Xlsx::ReactionList.new(objs: objs).create_xlsx(file_path)
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
