class ContainersController < ApplicationController

  def index
    #config.mailcollector = Rails.application.config_for(:mailcollector)


    #  mailcollector = Mailcollector.new(config.mailcollector["method"],
  #    config.mailcollector["address"],
  #    config.mailcollector["port"],
  #    config.mailcollector["user"],
  #    config.mailcollector["passwd"])


  #    mailcollector.execute



      @containers = Container.all
  end

  def show
      @container = Container.find(params[:id])
  end

  def new
  end

  def create
    @container = Container.new(container_params)

    @container.save

    redirect_to @container
  end

  def edit
    @container = Container.find(params[:id])
  end

  def update
    @container = Container.find(params[:id])

    if @container.update(container_params)
      redirect_to @container
    else
      render 'edit'
    end
  end

  private
  def container_params
    params.require(:container).permit(:name, :parentFolder)
  end
end
