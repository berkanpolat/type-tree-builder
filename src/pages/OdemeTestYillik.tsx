import OdemeTest from "./OdemeTest";

export default function OdemeTestYillik() {
  // Override URL search param so the component renders in "yillik" mode
  const original = window.location.search;
  const url = new URL(window.location.href);
  url.searchParams.set("periyot", "yillik");
  window.history.replaceState(null, "", url.toString());

  return <OdemeTest />;
}
