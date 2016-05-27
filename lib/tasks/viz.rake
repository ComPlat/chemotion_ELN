require 'json'
namespace :viz do
  task :compile do
    Dir[]
    dir= Dir[Rails.root.join('app',"assets","javascripts",'**','*.js')]
    plugin_dirnames=[]
    Bundler.load.current_dependencies.select{  |dep|  dep.groups.include?(:plugins)}.map(&:name).each_with_index do |plugin,i|
      plug_dirname = File.join(Gem.loaded_specs[plugin].full_gem_path,'app',"assets","javascripts")
      plugin_dirnames << plug_dirname
      plugin_path = File.join(plug_dirname,'**','*.js')
      dir+=Dir[plugin_path]
    end
    ###inspired from http://bl.ocks.org/mbostock/2675ff61ea5e063ede2b5d63c08020c7
    File.write("viz.html", %(
    <!DOCTYPE html>
    <meta charset="utf-8">
    <style>

    .links line {
      stroke: #aaa;
    }

    .nodes circle {
      pointer-events: all;
      stroke: none;
      stroke-width: 40px;
    }

    </style>
    <svg width="1960" height="1200"></svg>
    <script src="https://d3js.org/d3.v4.0.0-alpha.40.min.js"></script>
    <script>

    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height");

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    d3.json("viz_data.json", function(error, graph) {
      if (error) throw error;

      var link = svg.append("g")
          .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line");

      var node = svg.append("g")
          .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
          .attr("r", 2.5)
          .call(d3.drag()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended));

      node.append("title")
          .text(function(d) { return d.id; });

      simulation
          .nodes(graph.nodes)
          .on("tick", ticked);

      simulation.force("link")
          .links(graph.links);

      function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
      }
    });

    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart()
      simulation.fix(d);
    }

    function dragged(d) {
      simulation.fix(d, d3.event.x, d3.event.y);
    }

    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      simulation.unfix(d);
    }

    </script>

    ))
    main_dir = Rails.root.join("app","assets","javascripts")
    clean_name=lambda{|name| name.gsub(/#{main_dir}|#{plugin_dirnames.join('|')}/,"").gsub(/\.js/,"")}
    viz_data = {nodes:[],links:[]}
    basenames = dir.map{|f| File.basename(f,".js")}
    dir.each_with_index do |filename ,j |

      id_name = clean_name[filename]
      viz_data[:nodes] << {id: id_name, group: 1 }

      File.read(filename).split(/\n/).each do |line|
        line.match(/import .* from '(.+)'/)
        if modul=$1

          basenames.each_with_index do |bn,i|
#byebug
            if modul.match(/#{bn}/)
               viz_data[:links] <<  {"source": clean_name[dir[i]], target: id_name , "value": 1}
            end
          end
        end
      end
    end
    File.write("viz_data.json",JSON.pretty_generate(viz_data))
  end
end
