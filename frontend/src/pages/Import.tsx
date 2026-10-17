import { useMemo, useState } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { MessagesSquare, Send, AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/card";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { splitMessages } from "@/lib/validators";
import { formatQty } from "@/lib/utils";

type ParsedItem = { raw_text: string; product_text: string; quantity?: string; unit?: string };
type ParsedPayload = {
  customer: { name?: string; phone?: string; found?: boolean };
  items: ParsedItem[];
  delivery_notes: string[];
  unparsed_lines: string[];
  warnings: string[];
  requires_review: boolean;
};
type MessageResult = {
  index: number;
  message_id?: number;
  status: string;
  order_id?: number;
  order_number?: string;
  payload?: ParsedPayload;
  duplicate_of_id?: number;
  error?: string;
};
type Batch = {
  batch_id: number;
  total: number;
  processed: number;
  orders_created: number;
  duplicates: number;
  errors: number;
  messages: MessageResult[];
};

export default function Import() {
  const { push } = useToast();
  const [text, setText] = useState("");
  const { busy, run } = useSubmitLock();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const messageCount = useMemo(() => splitMessages(text).length, [text]);

  async function processBatch() {
    const messages = splitMessages(text);
    if (messages.length === 0) return push("أدخل مسجات الواتساب على الأقل", "error");
    setBatch(null);
    await run(async () => {
      try {
        const r = await api.post<Batch>("/import/messages", {
          messages: messages.map((s) => ({ raw_text: s })),
          label: `WA-${Date.now()}`,
        });
        setBatch(r.data);
        push(`تم المعالجة: ${r.data.orders_created} كوموند / ${r.data.duplicates} مكرر`, "success");
      } catch (e) {
        push(apiError(e), "error");
      }
    });
  }

  return (
    <>
      <PageHeader title="استيراد مسجات الواتساب" subtitle="لصق الرسائل، المراجعة قبل التأكيد التلقائي" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessagesSquare className="h-5 w-5" /> لصق المسجات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} placeholder={"مثال:\nسلام، 2 كرتونة كوكا لتر 1\n5 كيلو سكر"} aria-label="نص الرسائل" />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={processBatch} loading={busy}>
                <Send className="h-4 w-4" /> معالجة وإنشاء كوموندات
              </Button>
              <Button variant="outline" onClick={() => setText("")} disabled={!text}>
                مسح
              </Button>
              <span className="text-[13px] text-slate-500" aria-live="polite">
                عدد الرسائل: {messageCount}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>نتيجة المعالجة</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!batch && <EmptyState title="مازال ماشي معالجة" hint="ألصق المسجات واضغط معالجة" />}
            {batch && (
              <div className="flex flex-col divide-y divide-slate-100">
                <div className="flex flex-wrap gap-3 p-4 text-sm text-slate-600">
                  <Badge tone="navy">دفعة #{batch.batch_id}</Badge>
                  <span>الإجمالي: {batch.total}</span>
                  <span>تم: {batch.processed}</span>
                  <span className="text-emerald-700">كوموندات: {batch.orders_created}</span>
                  <span className="text-amber-700">مكررة: {batch.duplicates}</span>
                  <span className="text-red-700">أخطاء: {batch.errors}</span>
                </div>
                <div className="max-h-[55vh] overflow-y-auto">
                  {batch.messages.map((m) => (
                    <div key={m.index} className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">رسالة #{m.index + 1}</p>
                        {m.payload?.customer?.name && <p className="text-xs text-slate-500">الزبون: {m.payload.customer.name}</p>}
                        {m.payload?.items?.length ? (
                          <ul className="mt-1 space-y-1 text-xs text-slate-600">
                            {m.payload.items.slice(0, 2).map((it, i) => (
                              <li key={i}>
                                {it.product_text} — {it.quantity ?? "?"} {it.unit ?? ""}
                              </li>
                            ))}
                            {m.payload.items.length > 2 && <li className="text-slate-400">+{m.payload.items.length - 2} عناصر</li>}
                          </ul>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">ما كاينش عناصر</p>
                        )}
                        {m.payload?.warnings?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {m.payload.warnings.map((w, i) => (
                              <Badge key={i} tone="amber" className="text-[11px]">
                                <AlertCircle className="h-3 w-3" /> {w}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {m.order_number && (
                          <Badge tone="green" className="text-[11px]">
                            {m.order_number}
                          </Badge>
                        )}
                        {m.duplicate_of_id && <Badge tone="amber" className="text-[11px]">مكرر</Badge>}
                        {m.error && <Badge tone="red" className="text-[11px]">خطأ</Badge>}
                        <Button variant="ghost" size="sm" onClick={() => setOpenIdx(m.index)}>
                          تفاصيل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {batch && openIdx !== null && (
        <MsgDialog batch={batch} idx={openIdx} onClose={() => setOpenIdx(null)} />
      )}
    </>
  );
}

function MsgDialog({ batch, idx, onClose }: { batch: Batch; idx: number; onClose: () => void }) {
  const m = batch.messages[idx];
  if (!m) return null;
  const p = m.payload;
  return (
    <Dialog open onClose={onClose} title={`تفاصيل رسالة #${idx + 1}`} size="lg" footer={<Button onClick={onClose}>تم</Button>}>
      <div className="space-y-4 text-sm text-slate-600">
        {m.error && <Badge tone="red">{m.error}</Badge>}
        {p && (
          <>
            <div>
              <p className="font-medium text-slate-800 mb-1">الزبون</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>الاسم: {p.customer?.name || "—"}</div>
                <div>الهاتف: {p.customer?.phone || "—"}</div>
              </div>
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">العناصر</p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>النص الأصلي</th>
                      <th>منتج</th>
                      <th>الكمية</th>
                      <th>الوحدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.items.map((it, i) => (
                      <tr key={i}>
                        <td className="max-w-xs truncate">{it.raw_text}</td>
                        <td>{it.product_text}</td>
                        <td>{formatQty(it.quantity ?? "?")}</td>
                        <td>{it.unit || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="font-medium text-slate-800 mb-1">تنبيهات</p>
                {p.warnings.length ? (
                  <ul className="list-disc space-y-1 ps-4">
                    {p.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400">لاشيء</p>
                )}
              </div>
              <div>
                <p className="font-medium text-slate-800 mb-1">أسطر غير مفهومة</p>
                {p.unparsed_lines.length ? (
                  <ul className="list-disc space-y-1 ps-4">
                    {p.unparsed_lines.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400">لاشيء</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}