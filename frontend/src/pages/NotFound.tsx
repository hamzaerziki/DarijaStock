import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";

export default function NotFound() {
  return (
    <>
      <PageHeader title="صفحة غير موجودة" subtitle="الصفحة لي كتقلب عليها ما كايناش" />
      <Card>
        <CardContent>
          <EmptyState title="404" hint="شوف الرابط ولا ارجع للوحة القيادة" />
        </CardContent>
      </Card>
    </>
  );
}
