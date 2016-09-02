namespace :grape do
  desc "Condensed API Routes"
  task :routes => :environment do
    format = "%46s  %3s %7s %50s %12s:  %s"

    Rails.application.routes.routes.map do |r|
      ActionDispatch::Routing::RouteWrapper.new(r)
    end.reject do |r|
      r.internal?
    end.select do |r|
      r.rack_app < Grape::API rescue false
    end.each do |r|
      mapped_prefix = r.path
      api_class = r.rack_app

      api_class.routes.each do |grape_route|
        info = grape_route.instance_variable_get :@options
        path = grape_route.pattern.path
        puts format % [
            info[:description] ? info[:description][0..45] : '',
            info[:version],
            info[:method],
            path,
            '# params: ' + info[:params].length.to_s,
            info[:params].first.inspect
        ]
        if info[:params].length > 1
          info[:params].each_with_index do |param_info, index|
            next if index == 0
            puts format % ['','','','','',param_info.inspect]
          end
        end
      end
    end
  end
end
