class AttachmentsController < ApplicationController
  def create
    @container = Container.find(params[:container_id])
    @attachment = @container.attachments.create(attachment_params)
    redirect_to container_path(@container)
  end

  private
    def attachment_params
      params.require(:attachment).permit(:filename)
    end
end
