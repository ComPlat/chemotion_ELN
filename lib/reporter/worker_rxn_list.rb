module Reporter
  class WorkerRxnList < Worker
    def initialize(args)
      super(args)
    end

    def process
      @content_objs, @procedure_objs = prism(@objs)

      case @ext
      when 'xlsx'
        Reporter::Xlsx::ReactionList.new(
          objs: @content_objs,
          mol_serials: @mol_serials
        ).create(file_path)
      when 'csv'
        Reporter::Csv::ReactionList.new(
          objs: @content_objs,
          mol_serials: @mol_serials
        ).create(file_path)
      when 'zip'
        Reporter::Html::ReactionList.new(
          objs: @content_objs,
          mol_serials: @mol_serials,
          template_path: @template_path
        ).create(file_path)
      end

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
