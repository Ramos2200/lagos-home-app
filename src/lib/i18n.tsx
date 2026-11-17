"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Language options. Translations cover navigation, search and the main buttons. They are early drafts
 * that need checking by native speakers. Trust, safety and legal wording deliberately stays in English
 * until it has been professionally translated, so nothing important is mistranslated.
 */
export const LANGUAGES = [
  { code: "en", htmlLang: "en-NG", name: "English", english: "English" },
  { code: "yo", htmlLang: "yo", name: "Yorùbá", english: "Yoruba" },
  { code: "ig", htmlLang: "ig", name: "Igbo", english: "Igbo" },
  { code: "ha", htmlLang: "ha", name: "Hausa", english: "Hausa" },
  { code: "pcm", htmlLang: "pcm", name: "Naijá (Pidgin)", english: "Nigerian Pidgin" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];

const EN = {
  "nav.rent": "Rent",
  "nav.buy": "Buy",
  "nav.list": "List your home",
  "nav.checks": "How checks work",
  "nav.saved": "Saved homes",
  "nav.messages": "Messages",
  "nav.signin": "Sign in",
  "nav.join": "Join",
  "nav.getStarted": "Get started",
  "home.find": "Find your next home in Lagos.",
  "home.welcome": "Welcome back, {name}.",
  "home.sub": "Rent or buy, with the full cost up front — rent, fees and service charge, before you call anyone.",
  "home.placeholder": "Enter an area, estate or landmark",
  "home.search": "Search",
  "home.budget": "Budget",
  "home.price": "Price",
  "home.beds": "Beds",
  "home.type": "Type",
  "search.forRent": "For rent",
  "search.forSale": "For sale",
  "search.price": "Price",
  "search.beds": "Beds",
  "search.homeType": "Home type",
  "search.more": "More",
  "search.save": "Save search",
  "search.titleRent": "Lagos homes for rent",
  "search.titleSale": "Lagos homes for sale",
  "search.result": "result",
  "search.results": "results",
  "search.sort": "Sort:",
  "search.hideMap": "Hide map",
  "search.showMap": "Show map",
  "search.map": "Map",
  "search.showList": "Show list",
  "map.searchArea": "Search this area",
  "map.reset": "Reset",
  "listing.requestViewing": "Request a viewing",
  "listing.save": "Save",
  "listing.saved": "Saved",
  "listing.share": "Share",
  "listing.back": "Back to results",
  "lang.label": "Language",
  "lang.note": "Translations are early drafts and may have mistakes. Important notices stay in English.",
} as const;

export type MessageKey = keyof typeof EN;
type Dict = Partial<Record<MessageKey, string>>;

const YO: Dict = {
  "nav.rent": "Yá ilé",
  "nav.buy": "Ra ilé",
  "nav.list": "Polówó ilé rẹ",
  "nav.checks": "Bí àyẹ̀wò ṣe ń ṣiṣẹ́",
  "nav.saved": "Ilé tí o fipamọ́",
  "nav.messages": "Àwọn ìfiránṣẹ́",
  "nav.signin": "Wọlé",
  "nav.join": "Darapọ̀",
  "nav.getStarted": "Bẹ̀rẹ̀",
  "home.find": "Wá ilé rẹ tó kàn ní Èkó.",
  "home.welcome": "Ẹ káàbọ̀ padà, {name}.",
  "home.sub": "Yá tàbí ra ilé, kí o sì rí gbogbo owó ní ìbẹ̀rẹ̀ — owó ilé, owó àfikún àti owó ìtọ́jú, kí o tó pe ẹnikẹ́ni.",
  "home.placeholder": "Kọ àdúgbò, estate tàbí ibi tí a mọ̀",
  "home.search": "Wá",
  "home.budget": "Owó tí o ní",
  "home.price": "Iye owó",
  "home.beds": "Yàrá",
  "home.type": "Irú ilé",
  "search.forRent": "Fún yíyá",
  "search.forSale": "Fún títà",
  "search.price": "Iye owó",
  "search.beds": "Yàrá",
  "search.homeType": "Irú ilé",
  "search.more": "Síwájú sí i",
  "search.save": "Fi ìwádìí pamọ́",
  "search.titleRent": "Ilé fún yíyá ní Èkó",
  "search.titleSale": "Ilé fún títà ní Èkó",
  "search.result": "àbájáde",
  "search.results": "àbájáde",
  "search.sort": "Ṣètò:",
  "search.hideMap": "Fi máàpù pamọ́",
  "search.showMap": "Fi máàpù hàn",
  "search.map": "Máàpù",
  "search.showList": "Fi àkójọ hàn",
  "map.searchArea": "Wá ní agbègbè yìí",
  "map.reset": "Dá padà",
  "listing.requestViewing": "Béèrè láti wo ilé",
  "listing.save": "Fipamọ́",
  "listing.saved": "O ti fipamọ́",
  "listing.share": "Pín",
  "listing.back": "Padà sí àbájáde",
  "lang.label": "Èdè",
  "lang.note": "Àwọn ìtumọ̀ yìí jẹ́ àkọ́kọ́, ó lè ní àṣìṣe. Àwọn ìkìlọ̀ pàtàkì wà ní èdè Gẹ̀ẹ́sì.",
};

const IG: Dict = {
  "nav.rent": "Gbazite",
  "nav.buy": "Zụta",
  "nav.list": "Debanye ụlọ gị",
  "nav.checks": "Otú nyocha si arụ ọrụ",
  "nav.saved": "Ụlọ i chekwara",
  "nav.messages": "Ozi",
  "nav.signin": "Banye",
  "nav.join": "Sonye",
  "nav.getStarted": "Malite",
  "home.find": "Chọta ụlọ gị ọzọ na Lagos.",
  "home.welcome": "Nnọọ ọzọ, {name}.",
  "home.sub": "Gbazite ma ọ bụ zụta, hụ ego niile n'isi — ụgwọ ụlọ, ụgwọ ndị ọzọ na ụgwọ ọrụ, tupu ị kpọọ onye ọ bụla.",
  "home.placeholder": "Tinye mpaghara, estate ma ọ bụ ebe a ma ama",
  "home.search": "Chọọ",
  "home.budget": "Ego i nwere",
  "home.price": "Ọnụ ahịa",
  "home.beds": "Ime ụlọ",
  "home.type": "Ụdị ụlọ",
  "search.forRent": "Maka mgbazite",
  "search.forSale": "Maka ire",
  "search.price": "Ọnụ ahịa",
  "search.beds": "Ime ụlọ",
  "search.homeType": "Ụdị ụlọ",
  "search.more": "Ndị ọzọ",
  "search.save": "Chekwaa ọchụchọ",
  "search.titleRent": "Ụlọ maka mgbazite na Lagos",
  "search.titleSale": "Ụlọ maka ire na Lagos",
  "search.result": "nsonaazụ",
  "search.results": "nsonaazụ",
  "search.sort": "Hazie:",
  "search.hideMap": "Zoo map",
  "search.showMap": "Gosi map",
  "search.map": "Map",
  "search.showList": "Gosi ndepụta",
  "map.searchArea": "Chọọ na mpaghara a",
  "map.reset": "Malite ọzọ",
  "listing.requestViewing": "Rịọ ịhụ ụlọ a",
  "listing.save": "Chekwaa",
  "listing.saved": "Echekwala",
  "listing.share": "Kekọrịta",
  "listing.back": "Laghachi na nsonaazụ",
  "lang.label": "Asụsụ",
  "lang.note": "Ntụgharị ndị a bụ nke mbụ, ha nwere ike inwe mperi. Ọkwa ndị dị mkpa ka dị na Bekee.",
};

const HA: Dict = {
  "nav.rent": "Haya",
  "nav.buy": "Saya",
  "nav.list": "Saka gidanka",
  "nav.checks": "Yadda bincike ke aiki",
  "nav.saved": "Gidajen da ka adana",
  "nav.messages": "Saƙonni",
  "nav.signin": "Shiga",
  "nav.join": "Yi rajista",
  "nav.getStarted": "Fara",
  "home.find": "Nemo sabon gidanka a Legas.",
  "home.welcome": "Barka da dawowa, {name}.",
  "home.sub": "Yi haya ko saya, ka ga dukkan kuɗin tun farko — kuɗin haya, sauran kuɗaɗe da na kulawa, kafin ka kira kowa.",
  "home.placeholder": "Rubuta unguwa, rukunin gidaje ko sanannen wuri",
  "home.search": "Nema",
  "home.budget": "Kasafin kuɗi",
  "home.price": "Farashi",
  "home.beds": "Ɗakuna",
  "home.type": "Nau'in gida",
  "search.forRent": "Na haya",
  "search.forSale": "Na sayarwa",
  "search.price": "Farashi",
  "search.beds": "Ɗakuna",
  "search.homeType": "Nau'in gida",
  "search.more": "Ƙari",
  "search.save": "Adana bincike",
  "search.titleRent": "Gidajen haya a Legas",
  "search.titleSale": "Gidajen sayarwa a Legas",
  "search.result": "sakamako",
  "search.results": "sakamako",
  "search.sort": "Jera:",
  "search.hideMap": "Ɓoye taswira",
  "search.showMap": "Nuna taswira",
  "search.map": "Taswira",
  "search.showList": "Nuna jeri",
  "map.searchArea": "Nema a wannan yanki",
  "map.reset": "Sake saiti",
  "listing.requestViewing": "Nemi ganin gidan",
  "listing.save": "Adana",
  "listing.saved": "An adana",
  "listing.share": "Raba",
  "listing.back": "Koma ga sakamako",
  "lang.label": "Harshe",
  "lang.note": "Waɗannan fassarori na farko ne, suna iya samun kurakurai. Muhimman sanarwa suna cikin Turanci.",
};

const PCM: Dict = {
  "nav.rent": "Rent",
  "nav.buy": "Buy",
  "nav.list": "Put your house",
  "nav.checks": "How we dey check",
  "nav.saved": "Houses wey you save",
  "nav.messages": "Messages",
  "nav.signin": "Enter",
  "nav.join": "Join us",
  "nav.getStarted": "Start",
  "home.find": "Find your next house for Lagos.",
  "home.welcome": "Welcome back, {name}.",
  "home.sub": "Rent or buy, see all the money from start — rent, fees and service charge, before you call anybody.",
  "home.placeholder": "Type area, estate or place wey people sabi",
  "home.search": "Find am",
  "home.budget": "Your budget",
  "home.price": "Price",
  "home.beds": "Rooms",
  "home.type": "Kind of house",
  "search.forRent": "For rent",
  "search.forSale": "For sale",
  "search.price": "Price",
  "search.beds": "Rooms",
  "search.homeType": "Kind of house",
  "search.more": "More",
  "search.save": "Save this search",
  "search.titleRent": "Lagos houses for rent",
  "search.titleSale": "Lagos houses for sale",
  "search.result": "result",
  "search.results": "results",
  "search.sort": "Arrange:",
  "search.hideMap": "Hide map",
  "search.showMap": "Show map",
  "search.map": "Map",
  "search.showList": "Show list",
  "map.searchArea": "Find for this area",
  "map.reset": "Start again",
  "listing.requestViewing": "Ask to see the house",
  "listing.save": "Save",
  "listing.saved": "Don save",
  "listing.share": "Share",
  "listing.back": "Go back to results",
  "lang.label": "Language",
  "lang.note": "These translations na first draft, dem fit get mistake. Important notice still dey for English.",
};

const DICTS: Record<Lang, Dict> = { en: EN, yo: YO, ig: IG, ha: HA, pcm: PCM };
const LANG_KEY = "ilelagos-lang";

interface I18nApi {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nApi | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved && saved in DICTS) setLangState(saved as Lang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = LANGUAGES.find((l) => l.code === lang)?.htmlLang ?? "en-NG";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string>) => {
      let s = DICTS[lang][key] ?? EN[key];
      for (const [k, v] of Object.entries(vars ?? {})) s = s.replace(`{${k}}`, v);
      return s;
    },
    [lang],
  );

  const api = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={api}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nApi {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
