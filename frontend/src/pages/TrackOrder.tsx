import { useState } from 'react';
import { api, apiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Search, Package, FileText } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/utils';

type Item = {
  id: number;
  product_id?: number;
  raw_text?: string;
  unit_code?: string;
  quantity: string;
  unit_price: string;
  line_total: string;
};

type Order = {
  id: number;
  order_number: string;
  status: string;
  source: string;
  customer?: { name: string; phone?: string };
  total: string;
  subtotal: string;
  items: Item[];
  created_at?: string;
};

const statusMap: Record<string, { ar: string; color: string }> = {
  new: { ar: '????', color: 'bg-slate-100 text-slate-800' },
  needs_review: { ar: '?? ????????', color: 'bg-amber-100 text-amber-800' },
  confirmed: { ar: '????', color: 'bg-blue-100 text-blue-800' },
  reserved: { ar: '?????', color: 'bg-indigo-100 text-indigo-800' },
  preparing: { ar: '??? ??????', color: 'bg-violet-100 text-violet-800' },
  fulfilled: { ar: '?????', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { ar: '????', color: 'bg-rose-100 text-rose-800' },
};

export default function TrackOrder() {
  const { push } = useToast();
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  async function search() {
    setErr('');
    setOrder(null);
    if (!orderNumber.trim() || !/^0[5-7]\d{8}$/.test(phone.replace(/\D/g, ''))) {
      setErr('???? ??? ??????? ???? ???? ????');
      return;
    }
    setLoading(true);
    try {
      const r = await api.post<Order>('/public/orders/track', {
        order_number: orderNumber.trim(),
        phone: phone.replace(/\D/g, ''),
      });
      setOrder(r.data);
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='min-h-screen bg-slate-100'>
      <header className='border-b border-slate-200 bg-white'>
        <div className='mx-auto flex max-w-2xl items-center gap-2 px-4 py-4'>
          <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700'>
            <Search className='h-5 w-5' />
          </div>
          <div>
            <h1 className='text-lg font-bold text-slate-900'>???? ????</h1>
            <p className='text-xs text-slate-500'>??? ???? ???? ?????</p>
          </div>
        </div>
      </header>

      <main className='mx-auto max-w-2xl p-4 space-y-4'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileText className='h-5 w-5' /> ????? ?????????
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div>
              <Label required>??? ???????</Label>
              <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder='????: CMD-202610-00001' className='h-12 text-base code' />
            </div>
            <div>
              <Label required>??? ??????</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder='????: 0612345678' className='h-12 text-base code' inputMode='tel' />
            </div>
            {err && <FieldError>{err}</FieldError>}
            <Button className='h-12 w-full' loading={loading} onClick={search}>
              ???
            </Button>
          </CardContent>
        </Card>

        {order && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Package className='h-5 w-5' /> ?????? ???????
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-3 text-sm'>
                <div className='rounded-lg bg-slate-50 p-3'>
                  <p className='text-slate-500'>??? ???????</p>
                  <p className='font-bold code'>{order.order_number}</p>
                </div>
                <div className='rounded-lg bg-slate-50 p-3'>
                  <p className='text-slate-500'>??????</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusMap[order.status]?.color || 'bg-slate-100 text-slate-800'}`}>
                    {statusMap[order.status]?.ar || order.status}
                  </span>
                </div>
                <div className='rounded-lg bg-slate-50 p-3'>
                  <p className='text-slate-500'>???????</p>
                  <p className='font-bold'>{formatMoney(order.total)}</p>
                </div>
                <div className='rounded-lg bg-slate-50 p-3'>
                  <p className='text-slate-500'>???????</p>
                  <p className='text-slate-700'>{formatDate(order.created_at)}</p>
                </div>
                {order.customer?.name && (
                  <div className='col-span-2 rounded-lg bg-slate-50 p-3'>
                    <p className='text-slate-500'>??????</p>
                    <p className='font-medium'>{order.customer.name}</p>
                  </div>
                )}
              </div>

              <div>
                <p className='mb-2 font-medium'>????????</p>
                <div className='divide-y divide-slate-100 rounded-lg border border-slate-100'>
                  {order.items.map((it) => (
                    <div key={it.id} className='flex items-center justify-between px-3 py-2 text-sm'>
                      <div>
                        <p>{it.raw_text}</p>
                        <p className='text-xs text-slate-400'>{it.quantity} � {formatMoney(it.unit_price)}</p>
                      </div>
                      <div className='font-medium'>{formatMoney(it.line_total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
