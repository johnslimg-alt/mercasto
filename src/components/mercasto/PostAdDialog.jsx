import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listingStore } from "@/data/listingStore";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";

const CATS = [
  ["Productos","cat_products"], ["Motor","cat_motor"], ["Inmuebles","cat_realestate"], ["Empleos","cat_jobs"],
  ["Servicios","cat_services"], ["Negocios","cat_business"], ["Turismo","cat_tourism"], ["Boletos","cat_tickets"]
];
const EMPTY = { title:"", category:"", price:"", location:"", description:"" };

export default function PostAdDialog({ open, onOpenChange, onCreated, initialListing }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialListing ? {
      title: initialListing.title || "", category: initialListing.category || "",
      price: initialListing.price == null ? "" : String(initialListing.price),
      location: initialListing.location || "", description: initialListing.description || ""
    } : EMPTY);
  }, [open, initialListing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    if (!form.title.trim() || !form.category || !form.price) return;
    setSaving(true);
    try {
      await listingStore.create({ title:form.title, category:form.category, price:Number(form.price), location:form.location, description:form.description, verified:false, featured:false });
      toast({ description:t("ad_posted") }); setForm(EMPTY); onOpenChange(false); onCreated();
    } catch {
      toast({ description:t("post_error") });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t("post_dialog")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>{t("f_title")}</Label><Input value={form.title} onChange={set("title")} /></div>
          <div className="space-y-1.5">
            <Label>{t("f_category")}</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category:v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map(([value,key]) => <SelectItem key={value} value={value}>{t(key)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>{t("f_price")}</Label><Input type="number" min="0" value={form.price} onChange={set("price")} /></div>
            <div className="space-y-1.5"><Label>{t("f_location")}</Label><Input value={form.location} onChange={set("location")} /></div>
          </div>
          <div className="space-y-1.5"><Label>{t("f_description")}</Label><Textarea rows={3} value={form.description} onChange={set("description")} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving || !form.title.trim() || !form.category || !form.price} className="bg-primary hover:bg-primary/90">{saving ? "…" : t("f_publish")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
