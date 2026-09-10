import { Heart, MapPin, BadgeCheck, Image as ImageIcon } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useLang } from "@/lib/i18n";

export default function AdCard({ listing, badge, isFav, onFav, onSimilar, "data-collection-item-id": __dataCollectionItemId }) {
  const { t } = useLang();
  const suffix = listing.category === "Empleos" || listing.deal_type === "renta" ? "/mes" : "";

  return (
    <div data-source-location="src/components/mercasto/AdCard.jsx:10:4" data-dynamic-content="true" className="group border border-border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow" data-collection-item-id={__dataCollectionItemId}>
      <div data-source-location="src/components/mercasto/AdCard.jsx:11:6" data-dynamic-content="true" className="relative aspect-[4/3] bg-muted">
        {listing.image_url ?
        <Image data-source-location="src/components/mercasto/AdCard.jsx:13:10" data-dynamic-content="true" src={listing.image_url} alt={listing.title} fittingType="fill" className="w-full h-full" /> :

        <div data-source-location="src/components/mercasto/AdCard.jsx:15:10" data-dynamic-content="false" className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon data-source-location="src/components/mercasto/AdCard.jsx:15:96" data-dynamic-content="false" className="w-8 h-8" /></div>
        }
        {badge &&
        <span data-source-location="src/components/mercasto/AdCard.jsx:18:10" data-dynamic-content="true" className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-yellow-400 text-yellow-950 px-2 py-0.5 rounded" data-collection-item-field="badge" data-collection-item-id={__dataCollectionItemId}>{badge}</span>
        }
        <button data-source-location="src/components/mercasto/AdCard.jsx:20:8" data-dynamic-content="true"
        onClick={() => onFav(listing.id)}
        className={`absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 flex items-center justify-center transition ${isFav ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}
        aria-label="favorite">
          
          <Heart data-source-location="src/components/mercasto/AdCard.jsx:25:10" data-dynamic-content="true" className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
        </button>
      </div>
      <div data-source-location="src/components/mercasto/AdCard.jsx:28:6" data-dynamic-content="true" className="p-3" data-collection-item-field="verified" data-collection-item-id={listing?.id || listing?._id}>
        <h3 data-source-location="src/components/mercasto/AdCard.jsx:29:8" data-dynamic-content="true" className="font-medium text-sm line-clamp-2 min-h-[2.5rem]" data-collection-item-field="title" data-collection-item-id={listing?.id || listing?._id}>{listing.title}</h3>
        <p data-source-location="src/components/mercasto/AdCard.jsx:30:8" data-dynamic-content="true" className="mt-1 text-orange-600"><span data-source-location="src/components/mercasto/AdCard.jsx:30:44" data-dynamic-content="true" className="text-lg font-bold">${listing.price?.toLocaleString()}</span><span data-source-location="src/components/mercasto/AdCard.jsx:30:121" data-dynamic-content="true" className="text-xs font-semibold" data-collection-item-field="suffix" data-collection-item-id={__dataCollectionItemId}> MXN{suffix}</span></p>
        <p data-source-location="src/components/mercasto/AdCard.jsx:31:8" data-dynamic-content="true" className="text-xs text-muted-foreground flex items-center gap-1 mt-1" data-collection-item-field="location" data-collection-item-id={listing?.id || listing?._id}><MapPin data-source-location="src/components/mercasto/AdCard.jsx:31:82" data-dynamic-content="false" className="w-3 h-3 shrink-0" />{listing.location}</p>
        {listing.verified &&
        <p data-source-location="src/components/mercasto/AdCard.jsx:33:10" data-dynamic-content="true" className="text-xs text-teal-600 flex items-center gap-1 mt-1"><BadgeCheck data-source-location="src/components/mercasto/AdCard.jsx:33:76" data-dynamic-content="false" className="w-3.5 h-3.5" />{t("verified_seller")}</p>
        }
        {onSimilar &&
        <button data-source-location="src/components/mercasto/AdCard.jsx:36:10" data-dynamic-content="true" onClick={() => onSimilar(listing)} className="text-xs text-primary hover:underline mt-2">{t("post_similar")}</button>
        }
      </div>
    </div>);

}