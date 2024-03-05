import React from "react";
import expect from "expect";
import Enzyme, { shallow } from "enzyme";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";

import ResearchPlanFactory from "factories/ResearchPlanFactory";
import AttachmentFactory from "factories/AttachmentFactory";
import uuid from "uuid";
// although not used import of ElementStore needed to initialize
// the ResearchPlanDetails.js component. It must be executed before
// the import of ResearchPlanDetails. Beware of the linter which
// may put it at the end of the imports !!!

// eslint-disable-next-line no-unused-vars
import ElementStore from "src/stores/alt/stores/ElementStore";

import ResearchPlanDetails from "src/apps/mydb/elements/details/researchPlans/ResearchPlanDetails";

Enzyme.configure({
  adapter: new Adapter(),
});

describe("ResearchPlanDetails", async () => {
  const FIELD_ID_IMAGE = "entry-001";
  const FIELD_ID_NO_IMAGE = "entry-002";
  describe(".handleBodyChange", async () => {
    context("on non existing field", async () => {
      it(" expecting nothing was changed", async () => {
        const researchPlanWithImage = await ResearchPlanFactory.build(
          "with_image_body_field"
        );
        const wrapper = shallow(
          <ResearchPlanDetails
            researchPlan={researchPlanWithImage}
            toggleFullScreen={() => {}}
          />
        );
        wrapper.instance().handleBodyChange({}, "nonExistingFieldId", []);

        expect(researchPlanWithImage.changed).toEqual(false);
      });
    });

    context("on non image field", async () => {
      it(" expected to be changed", async () => {
        const researchPlanWithoutImage = await ResearchPlanFactory.build(
          "with_not_image_body_field"
        );

        const wrapper = shallow(
          <ResearchPlanDetails
            researchPlan={researchPlanWithoutImage}
            toggleFullScreen={() => {}}
          />
        );

        wrapper.instance().handleBodyChange(
          {
            test: "fakeValue",
          },
          FIELD_ID_NO_IMAGE,
          []
        );

        expect(researchPlanWithoutImage.changed).toEqual(true);
        expect(researchPlanWithoutImage.attachments.length).toEqual(1);
        expect(researchPlanWithoutImage.body).toEqual([
          {
            id: FIELD_ID_NO_IMAGE,
            type: "no-image",
            value: {
              test: "fakeValue",
            },
          },
        ]);
      });
    });
    context("replacing an image field for the first time", async () => {
      it("expecting to be replaced", async () => {
        const researchPlanWithImage = await ResearchPlanFactory.build(
          "with_image_body_field"
        );
        const newImageAttachment = await AttachmentFactory.build("new", {
          id: uuid.v1(),
        });

        const expectedField = {
          id: FIELD_ID_IMAGE,
          type: "image",
          value: {
            file_name: "abc.png",
            public_name: newImageAttachment.identifier,
          },
        };

        const wrapper = shallow(
          <ResearchPlanDetails
            researchPlan={researchPlanWithImage}
            toggleFullScreen={() => {}}
          />
        );

        wrapper
          .instance()
          .handleBodyChange(expectedField.value, FIELD_ID_IMAGE, [
            newImageAttachment,
          ]);

        expect(researchPlanWithImage.changed).toEqual(true);
        expect(researchPlanWithImage.attachments.length).toEqual(2);
        expect(researchPlanWithImage.attachments[1].identifier).toEqual(
          newImageAttachment.identifier
        );
        expect(researchPlanWithImage.body).toEqual([expectedField]);
      });
    });
    context(
      "replacing an image field for the second time - replacing an temporary image",
      async () => {
        it("expecting to be replaced with old value in memory", async () => {
          const attachmentToAdd = await AttachmentFactory.build("new", {
            id: uuid.v1(),
          });
          const researchPlanWithImage = await ResearchPlanFactory.build(
            "with_image_body_field"
          );

          const newValue = {
            file_name: "abc.png",
            public_name: attachmentToAdd.identifier,
            old_value: researchPlanWithImage.attachments[0].identifier,
          };

          const expectedField = {
            id: FIELD_ID_IMAGE,
            type: "image",
            value: newValue,
          };

          const wrapper = shallow(
            <ResearchPlanDetails
              researchPlan={researchPlanWithImage}
              toggleFullScreen={() => {}}
            />
          );

          wrapper
            .instance()
            .handleBodyChange(newValue, FIELD_ID_IMAGE, [attachmentToAdd]);

          expect(researchPlanWithImage.changed).toEqual(true);
          expect(researchPlanWithImage.attachments.length).toEqual(2);
          expect(researchPlanWithImage.body).toEqual([expectedField]);
        });
      }
    );
    context(
      "replacing an image field for the second time - replacing an already persisted image",
      async () => {
        it("expecting to be replaced with old value in memory", async () => {
          const attachmentToAdd = await AttachmentFactory.build("new", {
            id: uuid.v1(),
          });
          const researchPlanWithImage = await ResearchPlanFactory.build(
            "with_image_body_field"
          );
          researchPlanWithImage.attachments[0].file = [];
          researchPlanWithImage.attachments[0].file.preview =
            researchPlanWithImage.attachments[0].identifier;
          researchPlanWithImage.attachments[0].identifier = "none";

          const newValue = {
            file_name: "abc.png",
            public_name: attachmentToAdd.identifier,
            old_value: researchPlanWithImage.attachments[0].file.preview,
          };
          const expectedField = {
            id: FIELD_ID_IMAGE,
            type: "image",
            value: newValue,
          };

          const wrapper = shallow(
            <ResearchPlanDetails
              researchPlan={researchPlanWithImage}
              toggleFullScreen={() => {}}
            />
          );

          wrapper
            .instance()
            .handleBodyChange(newValue, FIELD_ID_IMAGE, [attachmentToAdd]);

          expect(researchPlanWithImage.changed).toEqual(true);
          expect(researchPlanWithImage.attachments.length).toEqual(2);
          expect(researchPlanWithImage.body).toEqual([expectedField]);
        });
      }
    );
  });
});
