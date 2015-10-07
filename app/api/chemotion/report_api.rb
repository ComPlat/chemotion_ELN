module Chemotion
  class ReportAPI < Grape::API
    resource :reports do
      desc "Build a report using the contents of a JSON file"

      params do
        optional :header, type: Hash
        requires :body, type: Array do
          requires :type, type: String
        end
      end
      post :rtf do
        report = Report::RTFReport.new do |r|
          r.header {|h| h.build(params[:header])}

          params[:body].each do |text_item|
            case text_item[:type]
            when "line_break"
              r.line_break
            when "image"
              r.add_image do |i|
                i.set_path 'data/example.svg'
                i.size x: 70, y: 10
              end
            when "paragraph"
              r.add_paragraph {|p| p.build(text_item)}
            when "table"
              r.add_table(text_item[:data].count, text_item[:data].first.count) do |t| 
                t.table_data = text_item[:data]
              end
            else
              raise "Fehler: Nicht implementierte Funktion: " + text_item[:type]
            end
          end

          env['api.format'] = :binary
          content_type('text/rtf')
          body report.generate_report
        end
      end

      params do
        requires :id, type: String
      end
      get :excel do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header 'Content-Disposition', "attachment; filename*=UTF-8''#{URI.escape("Sample Excel.xlsx")}"

        excel = ExcelExport.new

        Collection.find(params[:id]).samples.each do |sample|
          excel.add_sample(sample)
        end

        excel.generate_file
      end
    end
  end
end
