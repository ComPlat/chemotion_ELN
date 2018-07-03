module Reporter
  class WorkerRxnList < Worker
    def initialize(args)
      super(args)
    end

    def process
      @content_objs, @procedure_objs = prism(@objs)
      @tmpfile = Tempfile.new

      case @ext
      when 'xlsx'
        create_xlsx
      when 'csv'
        create_csv
      when 'html'
        create_html
      end

      create_attachment(@tmpfile) if @tmpfile
    end

    private

    def contents
      @objs
    end

    def create_xlsx
      @full_filename = "#{@file_name}.xlsx"
      @typ = XLSX_TYP
      Reporter::Xlsx::ReactionList.new(
        objs: @content_objs,
        mol_serials: @mol_serials
      ).create(@tmpfile.path)
    end

    def create_csv
      @full_filename = "#{@file_name}.csv"
      @typ = CSV_TYP
      Reporter::Csv::ReactionList.new(
        objs: @content_objs,
        mol_serials: @mol_serials
      ).create(@tmpfile.path)
    end

    def create_html
      @full_filename = "#{@file_name}.html"
      @typ = HTML_TYP
      Reporter::Html::ReactionList.new(
        objs: @content_objs,
        mol_serials: @mol_serials,
        template_path: @template_path
      ).create(@tmpfile.path)
    end
  end
end
