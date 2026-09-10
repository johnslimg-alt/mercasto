import { useEffect, useState, useCallback } from "react";
import { listingStore } from "@/data/listingStore";
import { TranslationProvider } from "@/lib/i18n";
import TopBar from "@/components/mercasto/TopBar";
import HeroSearch from "@/components/mercasto/HeroSearch";
import CategoryCircles from "@/components/mercasto/CategoryCircles";
import FeaturedSection from "@/components/mercasto/FeaturedSection";
import TrendingSection from "@/components/mercasto/TrendingSection";
import PromoBanners from "@/components/mercasto/PromoBanners";
import RealEstateSection from "@/components/mercasto/RealEstateSection";
import JobsSection from "@/components/mercasto/JobsSection";
import ServicesSection from "@/components/mercasto/ServicesSection";
import AutoSection from "@/components/mercasto/AutoSection";
import PricingSection from "@/components/mercasto/PricingSection";
import HowItWorks from "@/components/mercasto/HowItWorks";
import PopularSearches from "@/components/mercasto/PopularSearches";
import Footer from "@/components/mercasto/Footer";
import PostAdDialog from "@/components/mercasto/PostAdDialog";

const DEFAULT_FILTERS = { category: "", min: "", max: "", location: "", sort: "recent", favorites: false };

const SECTION_BY_CAT = {
  Motor: "automotriz",
  Inmuebles: "inmuebles",
  Empleos: "empleos",
  Servicios: "servicios",
  Tarifas: "planes"
};

function Board() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [favs, setFavs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("mercasto:favorites") || "[]")); } catch { return new Set(); }
  });
  const [dark, setDark] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  const load = useCallback(() => {
    listingStore.list().
    then(setListings).
    catch(() => setListings([])).
    finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const onFav = (id) =>
  setFavs((f) => {
    const n = new Set(f);
    if (n.has(id)) n.delete(id); else n.add(id);
    localStorage.setItem("mercasto:favorites", JSON.stringify([...n]));
    return n;
  });

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const goToGrid = (cat) => {
    setFilters((f) => ({ ...f, category: cat }));
    scrollTo("tendencias");
  };

  return (
    <div data-source-location="src/pages/Mercasto.jsx:70:4" data-dynamic-content="true" id="top" className="min-h-screen bg-background text-foreground">
      <TopBar data-source-location="src/pages/Mercasto.jsx:71:6" data-dynamic-content="true"
      favCount={favs.size}
      dark={dark}
      onToggleDark={() => setDark((d) => !d)}
      onPost={() => setPostOpen(true)}
      favoritesOnly={filters.favorites}
      onFavorites={() => setFilters((f) => ({ ...f, favorites: !f.favorites }))}
      onCategory={goToGrid} />
      
      <main data-source-location="src/pages/Mercasto.jsx:78:6" data-dynamic-content="true">
        <HeroSearch data-source-location="src/pages/Mercasto.jsx:79:8" data-dynamic-content="true"
        query={query}
        setQuery={setQuery}
        onSearch={() => scrollTo("tendencias")}
        filters={filters}
        setFilters={setFilters}
        filterOpen={filterOpen}
        onToggleFilters={() => setFilterOpen((o) => !o)} />
        
        <CategoryCircles data-source-location="src/pages/Mercasto.jsx:88:8" data-dynamic-content="true"
        onSelect={(cat) => {
          const section = SECTION_BY_CAT[cat];
          if (section) scrollTo(section);else
          goToGrid(cat);
        }} />
        
        <FeaturedSection data-source-location="src/pages/Mercasto.jsx:95:8" data-dynamic-content="true" listings={listings} loading={loading} favs={favs} onFav={onFav} />
        <TrendingSection data-source-location="src/pages/Mercasto.jsx:96:8" data-dynamic-content="true"
        listings={listings}
        loading={loading}
        query={query}
        setQuery={setQuery}
        filters={filters}
        setFilters={setFilters}
        onToggleFilters={() => setFilterOpen((o) => !o)}
        favs={favs}
        onFav={onFav} />
        
        <PromoBanners data-source-location="src/pages/Mercasto.jsx:107:8" data-dynamic-content="false" />
        <RealEstateSection data-source-location="src/pages/Mercasto.jsx:108:8" data-dynamic-content="true" listings={listings} favs={favs} onFav={onFav} />
        <JobsSection data-source-location="src/pages/Mercasto.jsx:109:8" data-dynamic-content="true" listings={listings} />
        <ServicesSection data-source-location="src/pages/Mercasto.jsx:110:8" data-dynamic-content="true" listings={listings} />
        <AutoSection data-source-location="src/pages/Mercasto.jsx:111:8" data-dynamic-content="true" listings={listings} favs={favs} onFav={onFav} />
        <PricingSection data-source-location="src/pages/Mercasto.jsx:112:8" data-dynamic-content="false" />
        <HowItWorks data-source-location="src/pages/Mercasto.jsx:113:8" data-dynamic-content="false" />
        <PopularSearches data-source-location="src/pages/Mercasto.jsx:114:8" data-dynamic-content="true"
        onPick={(q) => {
          setQuery(q);
          setFilters(DEFAULT_FILTERS);
          scrollTo("tendencias");
        }} />
        
      </main>
      <Footer data-source-location="src/pages/Mercasto.jsx:122:6" data-dynamic-content="false" />
      <PostAdDialog data-source-location="src/pages/Mercasto.jsx:123:6" data-dynamic-content="true" open={postOpen} onOpenChange={setPostOpen} onCreated={load} />
    </div>);

}

export default function Mercasto() {
  return (
    <TranslationProvider data-source-location="src/pages/Mercasto.jsx:131:4" data-dynamic-content="false">
      <Board data-source-location="src/pages/Mercasto.jsx:132:6" data-dynamic-content="false" />
    </TranslationProvider>);

}