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
        end

        content_type('text/rtf')

        env['api.format'] = :binary

        body report.generate_report
      end
    end
  end
end
