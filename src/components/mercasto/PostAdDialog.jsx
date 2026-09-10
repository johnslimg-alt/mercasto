import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listingStore } from "@/data/listingStore";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";

const CATS = ["Productos", "Motor", "Inmuebles", "Empleos", "Servicios", "Negocios", "Turismo", "Boletos"];

const EMPTY = { title: "", category: "", price: "", location: "", description: "" };

export default function PostAdDialog({ open, onOpenChange, onCreated }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title || !form.category || !form.price) return;
    setSaving(true);
    try {
      await listingStore.create({
        title: form.title,
        category: form.category,
        price: Number(form.price),
        location: form.location,
        description: form.description,
        verified: false,
        featured: false
      });
      toast({ description: t("ad_posted") });
      setForm(EMPTY);
      onOpenChange(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog data-source-location="src/components/mercasto/PostAdDialog.jsx:47:4" data-dynamic-content="true" open={open} onOpenChange={onOpenChange}>
      <DialogContent data-source-location="src/components/mercasto/PostAdDialog.jsx:48:6" data-dynamic-content="true" className="sm:max-w-lg">
        <DialogHeader data-source-location="src/components/mercasto/PostAdDialog.jsx:49:8" data-dynamic-content="true">
          <DialogTitle data-source-location="src/components/mercasto/PostAdDialog.jsx:50:10" data-dynamic-content="true">{t("post_dialog")}</DialogTitle>
        </DialogHeader>
        <div data-source-location="src/components/mercasto/PostAdDialog.jsx:52:8" data-dynamic-content="true" className="space-y-4">
          <div data-source-location="src/components/mercasto/PostAdDialog.jsx:53:10" data-dynamic-content="true" className="space-y-1.5">
            <Label data-source-location="src/components/mercasto/PostAdDialog.jsx:54:12" data-dynamic-content="true">{t("f_title")}</Label>
            <Input data-source-location="src/components/mercasto/PostAdDialog.jsx:55:12" data-dynamic-content="true" value={form.title} onChange={set("title")} />
          </div>
          <div data-source-location="src/components/mercasto/PostAdDialog.jsx:57:10" data-dynamic-content="true" className="space-y-1.5">
            <Label data-source-location="src/components/mercasto/PostAdDialog.jsx:58:12" data-dynamic-content="true">{t("f_category")}</Label>
            <Select data-source-location="src/components/mercasto/PostAdDialog.jsx:59:12" data-dynamic-content="true" value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger data-source-location="src/components/mercasto/PostAdDialog.jsx:60:14" data-dynamic-content="false"><SelectValue data-source-location="src/components/mercasto/PostAdDialog.jsx:60:29" data-dynamic-content="false" /></SelectTrigger>
              <SelectContent data-source-location="src/components/mercasto/PostAdDialog.jsx:61:14" data-dynamic-content="true">
                {CATS.map((c, __arrIdx__) => <SelectItem data-source-location="src/components/mercasto/PostAdDialog.jsx:62:33" data-dynamic-content="true" key={c} value={c} data-arr-index={__arrIdx__} data-arr-variable-name="CATS">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div data-source-location="src/components/mercasto/PostAdDialog.jsx:66:10" data-dynamic-content="true" className="grid grid-cols-2 gap-4">
            <div data-source-location="src/components/mercasto/PostAdDialog.jsx:67:12" data-dynamic-content="true" className="space-y-1.5">
              <Label data-source-location="src/components/mercasto/PostAdDialog.jsx:68:14" data-dynamic-content="true">{t("f_price")}</Label>
              <Input data-source-location="src/components/mercasto/PostAdDialog.jsx:69:14" data-dynamic-content="true" type="number" min="0" value={form.price} onChange={set("price")} />
            </div>
            <div data-source-location="src/components/mercasto/PostAdDialog.jsx:71:12" data-dynamic-content="true" className="space-y-1.5">
              <Label data-source-location="src/components/mercasto/PostAdDialog.jsx:72:14" data-dynamic-content="true">{t("f_location")}</Label>
              <Input data-source-location="src/components/mercasto/PostAdDialog.jsx:73:14" data-dynamic-content="true" value={form.location} onChange={set("location")} />
            </div>
          </div>
          <div data-source-location="src/components/mercasto/PostAdDialog.jsx:76:10" data-dynamic-content="true" className="space-y-1.5">
            <Label data-source-location="src/components/mercasto/PostAdDialog.jsx:77:12" data-dynamic-content="true">{t("f_description")}</Label>
            <Textarea data-source-location="src/components/mercasto/PostAdDialog.jsx:78:12" data-dynamic-content="true" rows={3} value={form.description} onChange={set("description")} />
          </div>
        </div>
        <DialogFooter data-source-location="src/components/mercasto/PostAdDialog.jsx:81:8" data-dynamic-content="true">
          <Button data-source-location="src/components/mercasto/PostAdDialog.jsx:82:10" data-dynamic-content="true" onClick={submit} disabled={saving || !form.title || !form.category || !form.price} className="bg-primary hover:bg-primary/90">
            {saving ? "…" : t("f_publish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}