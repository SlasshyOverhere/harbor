import chrome from "./pt/chrome";
import common from "./pt/common";
import catalog from "./pt/catalog";
import detail from "./pt/detail";
import player from "./pt/player";
import live from "./pt/live";
import settings from "./pt/settings";
import library from "./pt/library";
import sync from "./pt/sync";
import lists from "./pt/lists";
import downloads from "./pt/downloads";
import together from "./pt/together";
import rails from "./pt/rails";
import masthead from "./pt/masthead";
import discover from "./pt/discover";
import spotlights from "./pt/spotlights";
import misc from "./pt/misc";
import awards from "./pt/awards";
import addons from "./pt/addons";
import extra from "./pt/extra";

const pt: Record<string, string> = {
  ...chrome,
  ...common,
  ...catalog,
  ...detail,
  ...player,
  ...live,
  ...settings,
  ...library,
  ...sync,
  ...lists,
  ...downloads,
  ...together,
  ...rails,
  ...masthead,
  ...discover,
  ...spotlights,
  ...misc,
  ...awards,
  ...addons,
  ...extra,
};

export default pt;
