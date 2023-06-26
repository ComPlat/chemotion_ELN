import expect from "expect";
import { getLayout } from '../../../../../app/packs/src/utilities/CollectionTabsHelper';

describe("CollectionTabsHelper", async () => {
  describe(".getLayout", async () => {
    context("with empty layout", async () => {
      it("expects nothing", async () => {
        expect(getLayout({}, {})).toEqual({});
      });
    });

    context(" ", async () => {
      const tabs = {"samp": -13, "xtab_0": 8};
      const profileLayout = {"xtab_1": 8};
      it("expects ", async () => {
        expect(getLayout(tabs, profileLayout)).toEqual({"samp": -13, "xtab_0": 8, "xtab_1": 8});
      });
    });
  });
});
